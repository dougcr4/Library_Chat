import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Types
export interface FurnitureStyle { id: string; name: string; description: string; }
export interface FurnitureItem { id: string; name: string; description: string; category: string; }
export interface Project { id: string; name: string; type: string; status: string; createdAt: string; updatedAt: string; prompt: string; styleId?: string; itemId?: string; }
export interface Settings { ollamaUrl: string; ollamaModel: string; openWebUiUrl: string; }
export interface Message { role: 'user' | 'system'; content: string; type?: 'text' | 'model' | 'error'; stage?: string; estimatedSeconds?: number; isGenerating?: boolean; }

// Context/State
interface DesignerState {
  selectedStyleId: string | null;
  setSelectedStyleId: (id: string | null) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
  resetDesign: () => void;
}

const DesignerContext = createContext<DesignerState | undefined>(undefined);

export function DesignerProvider({ children }: { children: ReactNode }) {
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  
  const resetDesign = () => {
    setSelectedStyleId(null);
    setSelectedItemId(null);
    setMessages([]);
    setCurrentPrompt("");
  };

  return (
    <DesignerContext.Provider value={{
      selectedStyleId, setSelectedStyleId,
      selectedItemId, setSelectedItemId,
      messages, setMessages,
      currentPrompt, setCurrentPrompt,
      resetDesign
    }}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesignerContext() {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error("useDesignerContext must be used within a DesignerProvider");
  return ctx;
}

export function useStyles() {
  return useQuery({
    queryKey: ['/api/furniture/styles'],
    queryFn: async () => {
      const res = await fetch('/api/furniture/styles');
      if (!res.ok) throw new Error('Failed to fetch styles');
      return res.json() as Promise<{ styles: FurnitureStyle[] }>;
    }
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['/api/furniture/items'],
    queryFn: async () => {
      const res = await fetch('/api/furniture/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json() as Promise<{ items: FurnitureItem[] }>;
    }
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json() as Promise<{ projects: Project[] }>;
    }
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json() as Promise<Settings>;
    }
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Settings) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    }
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });
}

export function useGenerateModel() {
  return useMutation({
    mutationFn: async (data: { styleId?: string | null, itemId?: string | null, prompt: string }) => {
      const res = await fetch('/api/furniture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to generate model');
      return result;
    }
  });
}
