import { ChatPreferences } from "@/lib/types";

interface ChatPreferencesPanelProps {
  preferences: ChatPreferences;
  onPreferencesChange: (preferences: ChatPreferences) => void;
}

const ChatPreferencesPanel = ({ preferences, onPreferencesChange }: ChatPreferencesPanelProps) => {
  const updatePreference = <K extends keyof ChatPreferences>(
    key: K,
    value: ChatPreferences[K]
  ) => {
    onPreferencesChange({
      ...preferences,
      [key]: value,
    });
  };

  return (
    <div className="bg-[var(--neutral-100)] rounded-md border border-[var(--neutral-300)] p-3 space-y-3">
      {/* Model Selection */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">Model</label>
        <select
          value={preferences.model}
          onChange={(e) => updatePreference("model", e.target.value as ChatPreferences["model"])}
          className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
        >
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>

      {/* Thinking */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">Thinking</label>
        <select
          value={preferences.thinking}
          onChange={(e) => updatePreference("thinking", e.target.value as "off" | "force" | "auto")}
          className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
        >
          <option value="off">Off</option>
          <option value="auto">Auto</option>
          <option value="force">Force</option>
        </select>
      </div>

      {/* Google Search */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">Google Search</label>
        <select
          value={preferences.googleSearch}
          onChange={(e) => updatePreference("googleSearch", e.target.value as "auto" | "force" | "disable")}
          className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
        >
          <option value="auto">Auto</option>
          <option value="force">Force</option>
          <option value="disable">Disable</option>
        </select>
      </div>

      {/* Force Card Creation */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">Force Card Generation</label>
        <select
          value={preferences.forceCardCreation}
          onChange={(e) => updatePreference("forceCardCreation", e.target.value as "off" | "on" | "auto")}
          className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
        >
          <option value="auto">Auto</option>
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
      </div>

       {/* Personality */}
       <div className="flex items-center justify-between">
         <label className="text-sm font-medium text-[var(--foreground)]">Personality</label>
         <select
           value={preferences.personality}
           onChange={(e) => updatePreference("personality", e.target.value as ChatPreferences["personality"])}
           className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
         >
           <option value="default">Default</option>
           <option value="gossip">Gossip</option>
           <option value="little kid">Little Kid</option>
           <option value="angry mom">Angry Mom</option>
         </select>
       </div>

       {/* Follow-up Questions */}
       <div className="flex items-center justify-between">
         <label className="text-sm font-medium text-[var(--foreground)]">Follow-up Questions</label>
         <select
           value={preferences.followUpQuestions}
           onChange={(e) => updatePreference("followUpQuestions", e.target.value as "off" | "auto")}
           className="bg-[var(--neutral-200)] border border-[var(--neutral-300)] rounded px-2 py-1 text-sm text-[var(--foreground)]"
         >
           <option value="auto">Auto</option>
           <option value="off">Off</option>
         </select>
       </div>

     </div>
  );
};

export default ChatPreferencesPanel;