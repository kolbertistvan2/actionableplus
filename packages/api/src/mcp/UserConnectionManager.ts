import { logger } from '@librechat/data-schemas';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { MCPConnectionFactory } from '~/mcp/MCPConnectionFactory';
import { MCPServersRegistry } from '~/mcp/registry/MCPServersRegistry';
import { MCPConnection } from './connection';
import type * as t from './types';
import { ConnectionsRepository } from '~/mcp/ConnectionsRepository';
import { mcpConfig } from './mcpConfig';

/**
 * Generates a connection key for per-conversation isolation.
 * Format: serverName:conversationId or serverName (if no conversationId)
 */
function getConnectionKey(serverName: string, conversationId?: string): string {
  return conversationId ? `${serverName}:${conversationId}` : serverName;
}

/**
 * Extracts the serverName from a connection key.
 */
function getServerNameFromKey(key: string): string {
  const colonIndex = key.indexOf(':');
  return colonIndex > -1 ? key.substring(0, colonIndex) : key;
}

/**
 * Abstract base class for managing user-specific MCP connections with lifecycle management.
 * Only meant to be extended by MCPManager.
 * Much of the logic was move here from the old MCPManager to make it more manageable.
 * User connections will soon be ephemeral and not cached anymore:
 * https://github.com/danny-avila/LibreChat/discussions/8790
 *
 * IMPORTANT: Connections are now keyed by serverName:conversationId for per-conversation
 * session isolation. This prevents different conversations from interfering with each other's
 * MCP sessions (especially important for browser automation).
 */
export abstract class UserConnectionManager {
  // Connections shared by all users.
  public appConnections: ConnectionsRepository | null = null;
  // Connections per userId -> connectionKey (serverName:conversationId) -> connection
  protected userConnections: Map<string, Map<string, MCPConnection>> = new Map();
  /** Last activity timestamp for users (not per server) */
  protected userLastActivity: Map<string, number> = new Map();

  /** Updates the last activity timestamp for a user */
  protected updateUserLastActivity(userId: string): void {
    const now = Date.now();
    this.userLastActivity.set(userId, now);
    logger.debug(
      `[MCP][User: ${userId}] Updated last activity timestamp: ${new Date(now).toISOString()}`,
    );
  }

  /** Gets or creates a connection for a specific user and conversation */
  public async getUserConnection({
    serverName,
    forceNew,
    user,
    flowManager,
    customUserVars,
    requestBody,
    tokenMethods,
    oauthStart,
    oauthEnd,
    signal,
    returnOnOAuth = false,
    connectionTimeout,
  }: {
    serverName: string;
    forceNew?: boolean;
  } & Omit<t.OAuthConnectionOptions, 'useOAuth'>): Promise<MCPConnection> {
    const userId = user.id;
    if (!userId) {
      throw new McpError(ErrorCode.InvalidRequest, `[MCP] User object missing id property`);
    }

    if (await this.appConnections!.has(serverName)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `[MCP][User: ${userId}] Trying to create user-specific connection for app-level server "${serverName}"`,
      );
    }

    const config = await MCPServersRegistry.getInstance().getServerConfig(serverName, userId);

    // Use conversationId for per-conversation connection isolation
    const conversationId = requestBody?.conversationId;
    const connectionKey = getConnectionKey(serverName, conversationId);
    const logPrefix = `[MCP][User: ${userId}][${serverName}]${conversationId ? `[Conv: ${conversationId.slice(0, 8)}]` : ''}`;

    const userServerMap = this.userConnections.get(userId);
    let connection = forceNew ? undefined : userServerMap?.get(connectionKey);
    const now = Date.now();

    // Check if user is idle
    const lastActivity = this.userLastActivity.get(userId);
    if (lastActivity && now - lastActivity > mcpConfig.USER_CONNECTION_IDLE_TIMEOUT) {
      logger.info(`[MCP][User: ${userId}] User idle for too long. Disconnecting all connections.`);
      // Disconnect all user connections
      try {
        await this.disconnectUserConnections(userId);
      } catch (err) {
        logger.error(`[MCP][User: ${userId}] Error disconnecting idle connections:`, err);
      }
      connection = undefined; // Force creation of a new connection
    } else if (connection) {
      if (!config || (config.updatedAt && connection.isStale(config.updatedAt))) {
        if (config) {
          logger.info(`${logPrefix} Config was updated, disconnecting stale connection`);
        }
        await this.disconnectUserConnectionByKey(userId, connectionKey);
        connection = undefined;
      } else if (await connection.isConnected()) {
        logger.debug(`${logPrefix} Reusing active connection`);
        this.updateUserLastActivity(userId);
        return connection;
      } else {
        // Connection exists but is not connected, attempt to remove potentially stale entry
        logger.warn(`${logPrefix} Found existing but disconnected connection object. Cleaning up.`);
        this.removeUserConnectionByKey(userId, connectionKey); // Clean up maps
        connection = undefined;
      }
    }

    // Now check if config exists for new connection creation
    if (!config) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `[MCP][User: ${userId}] Configuration for server "${serverName}" not found.`,
      );
    }

    // If no valid connection exists, create a new one
    logger.info(`${logPrefix} Establishing new connection`);

    try {
      connection = await MCPConnectionFactory.create(
        {
          serverName: serverName,
          serverConfig: config,
        },
        {
          useOAuth: true,
          user: user,
          customUserVars: customUserVars,
          flowManager: flowManager,
          tokenMethods: tokenMethods,
          signal: signal,
          oauthStart: oauthStart,
          oauthEnd: oauthEnd,
          returnOnOAuth: returnOnOAuth,
          requestBody: requestBody,
          connectionTimeout: connectionTimeout,
        },
      );

      if (!(await connection?.isConnected())) {
        throw new Error('Failed to establish connection after initialization attempt.');
      }

      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Map());
      }
      // Store with connectionKey (serverName:conversationId) for per-conversation isolation
      this.userConnections.get(userId)?.set(connectionKey, connection);

      logger.info(`${logPrefix} Connection successfully established (key: ${connectionKey})`);
      // Update timestamp on creation
      this.updateUserLastActivity(userId);
      return connection;
    } catch (error) {
      logger.error(`${logPrefix} Failed to establish connection`, error);
      // Ensure partial connection state is cleaned up if initialization fails
      await connection?.disconnect().catch((disconnectError) => {
        logger.error(`${logPrefix} Error during cleanup after failed connection`, disconnectError);
      });
      // Ensure cleanup even if connection attempt fails
      this.removeUserConnectionByKey(userId, connectionKey);
      throw error; // Re-throw the error to the caller
    }
  }

  /** Returns all connections for a specific user */
  public getUserConnections(userId: string) {
    return this.userConnections.get(userId);
  }

  /** Removes a user connection entry by connectionKey (serverName:conversationId) */
  protected removeUserConnectionByKey(userId: string, connectionKey: string): void {
    const userMap = this.userConnections.get(userId);
    if (userMap) {
      userMap.delete(connectionKey);
      if (userMap.size === 0) {
        this.userConnections.delete(userId);
        // Only remove user activity timestamp if all connections are gone
        this.userLastActivity.delete(userId);
      }
    }

    logger.debug(`[MCP][User: ${userId}] Removed connection entry: ${connectionKey}`);
  }

  /** Removes a specific user connection entry by serverName (legacy - removes all for that server) */
  protected removeUserConnection(userId: string, serverName: string): void {
    const userMap = this.userConnections.get(userId);
    if (userMap) {
      // Find and remove all connections for this serverName (any conversationId)
      const keysToDelete = Array.from(userMap.keys()).filter(
        (key) => getServerNameFromKey(key) === serverName,
      );
      for (const key of keysToDelete) {
        userMap.delete(key);
      }
      if (userMap.size === 0) {
        this.userConnections.delete(userId);
        this.userLastActivity.delete(userId);
      }
    }

    logger.debug(`[MCP][User: ${userId}][${serverName}] Removed all connection entries.`);
  }

  /** Disconnects and removes a user connection by connectionKey */
  public async disconnectUserConnectionByKey(
    userId: string,
    connectionKey: string,
  ): Promise<void> {
    const userMap = this.userConnections.get(userId);
    const connection = userMap?.get(connectionKey);
    if (connection) {
      logger.info(`[MCP][User: ${userId}] Disconnecting: ${connectionKey}`);
      await connection.disconnect();
      this.removeUserConnectionByKey(userId, connectionKey);
    }
  }

  /** Disconnects and removes a specific user connection by serverName (legacy - disconnects all for that server) */
  public async disconnectUserConnection(userId: string, serverName: string): Promise<void> {
    const userMap = this.userConnections.get(userId);
    if (userMap) {
      // Find and disconnect all connections for this serverName (any conversationId)
      const keysToDisconnect = Array.from(userMap.keys()).filter(
        (key) => getServerNameFromKey(key) === serverName,
      );
      for (const key of keysToDisconnect) {
        const connection = userMap.get(key);
        if (connection) {
          logger.info(`[MCP][User: ${userId}] Disconnecting: ${key}`);
          await connection.disconnect();
          this.removeUserConnectionByKey(userId, key);
        }
      }
    }
  }

  /** Disconnects and removes all connections for a specific user */
  public async disconnectUserConnections(userId: string): Promise<void> {
    const userMap = this.userConnections.get(userId);
    const disconnectPromises: Promise<void>[] = [];
    if (userMap) {
      logger.info(`[MCP][User: ${userId}] Disconnecting all connections...`);
      const connectionKeys = Array.from(userMap.keys());
      for (const connectionKey of connectionKeys) {
        disconnectPromises.push(
          this.disconnectUserConnectionByKey(userId, connectionKey).catch((error) => {
            logger.error(`[MCP][User: ${userId}] Error disconnecting ${connectionKey}:`, error);
          }),
        );
      }
      await Promise.allSettled(disconnectPromises);
      // Ensure user activity timestamp is removed
      this.userLastActivity.delete(userId);
      logger.info(`[MCP][User: ${userId}] All connections processed for disconnection.`);
    }
  }

  /** Check for and disconnect idle connections */
  protected checkIdleConnections(currentUserId?: string): void {
    const now = Date.now();

    // Iterate through all users to check for idle ones
    for (const [userId, lastActivity] of this.userLastActivity.entries()) {
      if (currentUserId && currentUserId === userId) {
        continue;
      }
      if (now - lastActivity > mcpConfig.USER_CONNECTION_IDLE_TIMEOUT) {
        logger.info(
          `[MCP][User: ${userId}] User idle for too long. Disconnecting all connections...`,
        );
        // Disconnect all user connections asynchronously (fire and forget)
        this.disconnectUserConnections(userId).catch((err) =>
          logger.error(`[MCP][User: ${userId}] Error disconnecting idle connections:`, err),
        );
      }
    }
  }
}
