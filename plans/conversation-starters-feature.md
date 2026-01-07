# Conversation Starters Feature - Implementation Plans

## Overview

Two implementation options for improving the chat landing experience:
- **Plan B:** Add conversation_starters editor to Agent Builder UI
- **Plan C:** Interactive Prompt Builder with dynamic forms

---

## Plan B: Agent Builder Conversation Starters Editor

### Goal
Enable editing of static conversation starters directly in the Agent Builder UI.

### Complexity: Medium
**Estimated effort:** ~2-4 hours

### What Already Exists
- `conversation_starters` field in agent schema (`packages/data-schemas/src/schema/agent.ts:83`)
- `AssistantConversationStarters` component (`client/src/components/SidePanel/Builder/AssistantConversationStarters.tsx`)
- `ConversationStarters` display component (`client/src/components/Chat/Input/ConversationStarters.tsx`)
- Backend already saves/loads `conversation_starters` for agents

### Files to Modify

#### 1. `client/src/components/SidePanel/Agents/AgentConfig.tsx`
Add the conversation starters section after Instructions:

```tsx
// Import
import AssistantConversationStarters from '../Builder/AssistantConversationStarters';

// In the component, add after Instructions:
<div className="mb-4">
  <Controller
    name="conversation_starters"
    control={control}
    render={({ field }) => (
      <AssistantConversationStarters
        field={field}
        inputClass={inputClass}
        labelClass={labelClass}
      />
    )}
  />
</div>
```

#### 2. `client/src/common/agents-types.ts` (or wherever AgentForm is defined)
Ensure `conversation_starters` is in the form type:

```ts
interface AgentForm {
  // ... existing fields
  conversation_starters?: string[];
}
```

#### 3. `client/src/components/SidePanel/Agents/AgentPanel.tsx`
Add `conversation_starters` to the payload in `composeAgentUpdatePayload`:

```ts
const {
  conversation_starters,  // Add this
  // ... other fields
} = data;

return {
  payload: {
    conversation_starters,  // Add this
    // ... other fields
  }
}
```

#### 4. `client/src/utils/agents.ts` (or wherever default form values are)
Add default value:

```ts
export const getDefaultAgentFormValues = () => ({
  // ... existing defaults
  conversation_starters: [],
});
```

### Result
- Agent Builder will have a "Conversation Starters" section
- Users can add up to 4 static text starters
- Clicking a starter sends that exact text as the first message

### Limitations
- Static text only (no input fields or dynamic values)
- Max 4 starters (LibreChat limit)
- No URL input forms

---

## Plan C: Interactive Prompt Builder

### Goal
Create a dynamic form system where agents can define custom input fields that generate prompts.

### Complexity: High
**Estimated effort:** ~2-3 days

### Concept

Instead of static text starters, agents define **prompt templates** with **input fields**:

```yaml
# In agent config (new field)
prompt_forms:
  - id: "cro-audit"
    label: "CRO Audit"
    icon: "chart-bar"
    description: "Comprehensive webshop analysis"
    fields:
      - name: "url"
        type: "url"
        label: "Webshop URL"
        placeholder: "https://example.com"
        required: true
      - name: "focus"
        type: "select"
        label: "Focus Area"
        options:
          - { value: "all", label: "Full Audit" }
          - { value: "checkout", label: "Checkout Only" }
          - { value: "mobile", label: "Mobile UX" }
    template: "Run a CRO audit on {{url}} with focus on {{focus}}"

  - id: "shipping-research"
    label: "Shipping Research"
    icon: "truck"
    fields:
      - name: "url"
        type: "url"
        label: "Webshop URL"
        required: true
      - name: "country"
        type: "select"
        label: "Target Country"
        options:
          - { value: "HU", label: "Hungary" }
          - { value: "DE", label: "Germany" }
          - { value: "AT", label: "Austria" }
    template: "Research shipping options for {{url}} to {{country}}"
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Landing Page                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Chat Input (existing)                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │CRO Audit│ │Shipping │ │Competitor│ │ Custom │          │
│   │  📊     │ │   🚚    │ │   🔍    │ │   ✏️   │          │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│        │           │           │           │                │
│        └───────────┴───────────┴───────────┘                │
│                        │                                    │
│                        ▼                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Prompt Form (when clicked)              │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │ Webshop URL: [________________________]       │  │   │
│   │  └───────────────────────────────────────────────┘  │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │ Focus Area: [Full Audit           ▼]          │  │   │
│   │  └───────────────────────────────────────────────┘  │   │
│   │                                                     │   │
│   │           [Cancel]  [🚀 Start Audit]                │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Files to Create

#### 1. `packages/data-schemas/src/schema/promptForm.ts`
Schema for prompt forms:

```ts
export const promptFormFieldSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'url', 'select', 'number', 'textarea'], required: true },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  options: [{
    value: String,
    label: String
  }],
  validation: {
    pattern: String,
    min: Number,
    max: Number,
  }
});

export const promptFormSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  icon: String,
  description: String,
  fields: [promptFormFieldSchema],
  template: { type: String, required: true }
});
```

#### 2. `client/src/components/Chat/Input/PromptFormCards.tsx`
Display clickable cards for each prompt form:

```tsx
interface PromptFormCardsProps {
  forms: PromptForm[];
  onSelect: (form: PromptForm) => void;
}

const PromptFormCards: React.FC<PromptFormCardsProps> = ({ forms, onSelect }) => {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      {forms.map((form) => (
        <button
          key={form.id}
          onClick={() => onSelect(form)}
          className="flex w-32 flex-col items-center gap-2 rounded-2xl border border-border-medium p-4 hover:bg-surface-tertiary"
        >
          <span className="text-2xl">{getIcon(form.icon)}</span>
          <span className="text-sm font-medium">{form.label}</span>
        </button>
      ))}
    </div>
  );
};
```

#### 3. `client/src/components/Chat/Input/PromptFormDialog.tsx`
Modal/inline form for entering values:

```tsx
interface PromptFormDialogProps {
  form: PromptForm;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}

const PromptFormDialog: React.FC<PromptFormDialogProps> = ({ form, onSubmit, onCancel }) => {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    let prompt = form.template;
    Object.entries(values).forEach(([key, value]) => {
      prompt = prompt.replace(`{{${key}}}`, value);
    });
    onSubmit(prompt);
  };

  return (
    <div className="rounded-xl border bg-surface-primary p-4 shadow-lg">
      <h3 className="mb-4 text-lg font-semibold">{form.label}</h3>
      {form.fields.map((field) => (
        <div key={field.name} className="mb-3">
          <label className="mb-1 block text-sm">{field.label}</label>
          {field.type === 'select' ? (
            <select
              value={values[field.name] || ''}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              className="w-full rounded-lg border p-2"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={values[field.name] || ''}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full rounded-lg border p-2"
            />
          )}
        </div>
      ))}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} className="btn btn-primary">Start</button>
      </div>
    </div>
  );
};
```

#### 4. `client/src/components/SidePanel/Agents/PromptFormsEditor.tsx`
UI for editing prompt forms in Agent Builder:

```tsx
// Visual editor for creating/editing prompt forms
// - Add/remove forms
// - Add/remove fields per form
// - Field type selection
// - Template editor with variable insertion
```

### Files to Modify

#### 1. Agent Schema
Add `prompt_forms` field:

```ts
// packages/data-schemas/src/schema/agent.ts
prompt_forms: {
  type: [promptFormSchema],
  default: []
}
```

#### 2. `client/src/components/Chat/ChatView.tsx`
Replace or augment ConversationStarters with PromptFormCards:

```tsx
{isLandingPage && (
  <>
    {hasPromptForms ? (
      <PromptFormCards forms={agent.prompt_forms} onSelect={handleFormSelect} />
    ) : (
      <ConversationStarters />
    )}
  </>
)}
```

#### 3. Agent Builder
Add PromptFormsEditor section in AgentConfig.tsx

### Migration Path

1. Keep existing `conversation_starters` for backwards compatibility
2. New `prompt_forms` takes precedence when present
3. Fallback to `conversation_starters` if no `prompt_forms`

---

## Comparison

| Feature | Plan B | Plan C |
|---------|--------|--------|
| Development time | 2-4 hours | 2-3 days |
| Static text starters | ✅ | ✅ |
| Input fields | ❌ | ✅ |
| Dropdowns/selects | ❌ | ✅ |
| URL validation | ❌ | ✅ |
| Template variables | ❌ | ✅ |
| Visual form builder | ❌ | ✅ |
| Backend changes | Minimal | New schema |
| UX improvement | Medium | High |

---

## Recommendation

**Start with Plan B**, then iterate to Plan C:

1. **Week 1:** Implement Plan B
   - Quick win, enables basic starters
   - Users can immediately use static starters

2. **Week 2-3:** Implement Plan C
   - Build on Plan B foundation
   - Add dynamic form system
   - Agent-specific prompt builders

---

## Example Configurations

### CRO Audit Agent (Plan C)

```yaml
prompt_forms:
  - id: "full-audit"
    label: "Full CRO Audit"
    icon: "📊"
    fields:
      - name: "url"
        type: "url"
        label: "Webshop URL"
        placeholder: "https://yourshop.com"
        required: true
    template: "Run a full CRO audit on {{url}}"

  - id: "page-audit"
    label: "Single Page Audit"
    icon: "📄"
    fields:
      - name: "url"
        type: "url"
        label: "Page URL"
        required: true
      - name: "page_type"
        type: "select"
        label: "Page Type"
        options:
          - { value: "product", label: "Product Page" }
          - { value: "category", label: "Category Page" }
          - { value: "checkout", label: "Checkout" }
          - { value: "home", label: "Home Page" }
    template: "Analyze the {{page_type}} page at {{url}}"

  - id: "competitor"
    label: "Competitor Analysis"
    icon: "🔍"
    fields:
      - name: "your_url"
        type: "url"
        label: "Your Webshop"
        required: true
      - name: "competitor_url"
        type: "url"
        label: "Competitor Webshop"
        required: true
    template: "Compare CRO of {{your_url}} vs {{competitor_url}}"
```

### Shipping Research Agent (Plan C)

```yaml
prompt_forms:
  - id: "shipping-research"
    label: "Shipping Research"
    icon: "🚚"
    fields:
      - name: "url"
        type: "url"
        label: "Webshop URL"
        required: true
      - name: "origin"
        type: "select"
        label: "Ship From"
        options:
          - { value: "HU", label: "Hungary" }
          - { value: "CN", label: "China" }
          - { value: "EU", label: "EU Warehouse" }
      - name: "destination"
        type: "select"
        label: "Ship To"
        options:
          - { value: "HU", label: "Hungary" }
          - { value: "DE", label: "Germany" }
          - { value: "AT", label: "Austria" }
          - { value: "RO", label: "Romania" }
    template: "Research shipping options for {{url}} from {{origin}} to {{destination}}"
```
