# ActionablePlus Expo Mobile App Plan

## Összefoglaló

Expo React Native mobile app készítése a meglévő ActionablePlus (LibreChat) webalkalmazásból.

## Platform

- **iOS** - App Store
- **Android** - Play Store
- **Expo SDK 52** + EAS Build

---

## Tech Stack Összehasonlítás

| Technológia | Web | Mobile (Expo) |
|-------------|-----|---------------|
| Routing | React Router v6 | Expo Router |
| State | Recoil + Jotai | Recoil + Jotai ✅ |
| HTTP | Axios | Axios ✅ |
| React Query | v4 | v4 ✅ |
| Storage | localStorage | AsyncStorage |
| i18n | i18next | i18next ✅ |
| Markdown | react-markdown | react-native-markdown-display |
| UI | Radix UI + Tailwind | React Native Paper |
| Real-time | SSE (sse.js) | react-native-sse |

---

## Újrafelhasználható Kód (~60%)

```
packages/
├── data-provider/     # API típusok, sémák (100% reusable)
├── api-client/        # Axios wrapper (90% reusable)
└── shared/            # Utils, constants (80% reusable)

client/src/
├── store/             # Recoil atoms (95% reusable)
├── data-provider/     # React Query hooks (90% reusable)
└── hooks/             # Custom hooks (50% reusable)
```

---

## Projekt Struktúra (Monorepo)

```
actionableplus/                    # Meglévő repo
├── api/                          # Backend (változatlan)
├── client/                       # Web frontend (változatlan)
├── packages/
│   └── data-provider/            # Meglévő - shared types
├── mobile/                       # ÚJ - Expo app
│   ├── app/                      # Expo Router
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Chat list
│   │   │   ├── agents.tsx        # Marketplace
│   │   │   └── settings.tsx
│   │   ├── chat/
│   │   │   └── [id].tsx          # Chat screen
│   │   └── _layout.tsx           # Root layout
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Messages/
│   │   │   └── Agents/
│   │   ├── store/                # Recoil atoms
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── storage.ts
│   │   └── utils/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   └── eas.json
└── package.json                  # Root workspaces
```

---

## Fő Kihívások & Megoldások

### 1. SSE Streaming
```typescript
// Web: sse.js library
// Mobile: react-native-sse

import RNEventSource from 'react-native-sse';

const eventSource = new RNEventSource(url, {
  headers: { Authorization: `Bearer ${token}` }
});
eventSource.addEventListener('message', (event) => {
  // Handle streaming response
});
```

### 2. Token Storage
```typescript
// services/storage.ts
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async getToken() {
    return SecureStore.getItemAsync('authToken');
  },
  async setToken(token: string) {
    return SecureStore.setItemAsync('authToken', token);
  },
  async removeToken() {
    return SecureStore.deleteItemAsync('authToken');
  }
};
```

### 3. File Upload
```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (!result.canceled) {
    await uploadFile(result.assets[0]);
  }
};
```

### 4. Deep Linking
```typescript
// app.json
{
  "expo": {
    "scheme": "actionableplus",
    "plugins": ["expo-router"]
  }
}

// URLs:
// actionableplus://chat/123
// actionableplus://agents
```

---

## MVP Funkciók (Phase 1)

- [ ] Login / Register (email + Google OAuth)
- [ ] Chat list (conversations)
- [ ] Chat screen (send/receive)
- [ ] SSE streaming responses
- [ ] Agent selection
- [ ] Basic markdown rendering
- [ ] Dark/Light theme

## Phase 2 Funkciók

- [ ] Image upload
- [ ] Push notifications
- [ ] Offline cache
- [ ] Voice input (Expo Speech)
- [ ] Artifact preview (WebView)

---

## Függőségek

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react-native": "0.76.x",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-image-picker": "~16.0.0",
    "recoil": "^0.7.7",
    "@tanstack/react-query": "^4.36.0",
    "axios": "^1.6.0",
    "react-native-markdown-display": "^7.0.0",
    "react-native-paper": "^5.12.0",
    "react-native-sse": "^1.2.0",
    "i18next": "^23.0.0",
    "react-i18next": "^15.0.0"
  }
}
```

---

## Időbecslés

| Phase | Scope | Idő |
|-------|-------|-----|
| Setup | Expo projekt, navigation, providers | 1-2 hét |
| Auth | Login, register, OAuth, token mgmt | 1 hét |
| Chat | List, chat UI, streaming, markdown | 2-3 hét |
| Agents | Marketplace, categories, selection | 1 hét |
| Polish | Testing, bugs, UX improvements | 1-2 hét |
| **Total** | **MVP** | **6-9 hét** |

---

## Backend API Endpoints (Használandó)

```
POST   /api/auth/login          # Email login
POST   /api/auth/register       # Registration
POST   /api/auth/refresh        # Token refresh
GET    /api/auth/logout         # Logout

GET    /api/convos              # List conversations
DELETE /api/convos/:id          # Delete conversation

GET    /api/messages/:convoId   # Get messages
POST   /api/agents/chat         # Send message (SSE stream)

GET    /api/agents              # List agents
GET    /api/agents/:id          # Agent details
```

---

## Következő Lépések

1. `npx create-expo-app mobile --template tabs`
2. Konfiguráció (app.json, tsconfig)
3. Auth flow implementálása
4. Chat UI felépítése
5. SSE streaming integrálása
6. EAS Build setup iOS/Android-ra
