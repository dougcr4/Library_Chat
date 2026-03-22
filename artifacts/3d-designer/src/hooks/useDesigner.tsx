import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Types
export interface FurnitureStyle { id: string; name: string; description: string; }
export interface FurnitureItem { id: string; name: string; description: string; category: string; }
export interface Project { id: string; name: string; type: string; status: string; createdAt: string; updatedAt: string; prompt: string; styleId?: string; itemId?: string; designId?: string; sizeId?: string; }
export interface Settings { 
  ollamaUrl: string; 
  ollamaModel: string; 
  openWebUiUrl: string; 
  openWebUiApiKey: string;
  cadqueryViewerUrl?: string; 
  jupyterLabUrl?: string; 
  sharedDesignsPath?: string;
}
export interface Message { role: 'user' | 'system'; content: string; type?: 'text' | 'model' | 'error'; stage?: string; estimatedSeconds?: number; isGenerating?: boolean; }

// Building Types
export interface FitoutSelection {
  sectionId: string;
  optionId: string;
  productId: string;
  cribbCode: string | null;
}
export interface BuildingCatalogue {
  designs: { id: string; code: string; name: string; description: string }[];
  sizes: { id: string; name: string; label: string; approxWidth: number | null; approxLength: number | null; planningFlag: boolean; buildingRegsFlag: boolean }[];
  sipThicknesses: { id: string; totalMm: number; osbMm: number; epsMm: number; label: string }[];
  fitoutSections: FitoutSection[];
}
export interface FitoutSection {
  id: string; code: string; name: string;
  options: FitoutOption[];
}
export interface FitoutOption {
  id: string; code: string; name: string;
  products: FitoutProduct[];
}
export interface FitoutProduct {
  id: string; code: string; name: string;
  cribbCodes: { index: number; label: string; code: string }[];
}

// Context/State
interface DesignerState {
  mode: 'furniture' | 'building';
  setMode: (mode: 'furniture' | 'building') => void;
  selectedStyleId: string | null;
  setSelectedStyleId: (id: string | null) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  
  selectedDesignId: string | null;
  setSelectedDesignId: (id: string | null) => void;
  selectedSizeId: string | null;
  setSelectedSizeId: (id: string | null) => void;
  selectedSipThicknessId: string | null;
  setSelectedSipThicknessId: (id: string | null) => void;
  fitoutSelections: FitoutSelection[];
  setFitoutSelections: React.Dispatch<React.SetStateAction<FitoutSelection[]>>;

  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
  resetDesign: () => void;
}

const DesignerContext = createContext<DesignerState | undefined>(undefined);

export function DesignerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'furniture' | 'building'>('furniture');
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedSipThicknessId, setSelectedSipThicknessId] = useState<string | null>(null);
  const [fitoutSelections, setFitoutSelections] = useState<FitoutSelection[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  
  const resetDesign = () => {
    setSelectedStyleId(null);
    setSelectedItemId(null);
    setSelectedDesignId(null);
    setSelectedSizeId(null);
    setSelectedSipThicknessId(null);
    setFitoutSelections([]);
    setMessages([]);
    setCurrentPrompt("");
  };

  return (
    <DesignerContext.Provider value={{
      mode, setMode,
      selectedStyleId, setSelectedStyleId,
      selectedItemId, setSelectedItemId,
      selectedDesignId, setSelectedDesignId,
      selectedSizeId, setSelectedSizeId,
      selectedSipThicknessId, setSelectedSipThicknessId,
      fitoutSelections, setFitoutSelections,
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

export function useBuildingsCatalogue() {
  return useQuery({
    queryKey: ['/api/buildings/catalogue'],
    queryFn: async () => {
      const res = await fetch('/api/buildings/catalogue');
      if (!res.ok) throw new Error('Failed to fetch buildings catalogue');
      return res.json() as Promise<BuildingCatalogue>;
    }
  });
}

async function safeJson(res: Response, fallbackMsg: string) {
  const text = await res.text().catch(() => '(no body)');
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`⚠️ API returned non-JSON (HTTP ${res.status}): ${preview}`);
  }
}

async function safeFetch(url: string, options: RequestInit) {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    throw new Error(`⚠️ Network error reaching ${url} — is the API server running on port 8080? (${err?.message ?? err})`);
  }
}

export function useGenerateBuilding() {
  return useMutation({
    mutationFn: async (data: { designId: string | null, sizeId: string | null, sipThicknessId: string | null, fitoutSelections: FitoutSelection[], additionalNotes: string }) => {
      const res = await safeFetch('/api/buildings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await safeJson(res, 'Failed to generate building model');
      if (!res.ok) throw new Error(result.error || 'Failed to generate building model');
      return result;
    }
  });
}

export function useFixDesign() {
  return useMutation({
    mutationFn: async (error?: string) => {
      const res = await safeFetch('/api/fix-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error ?? '' })
      });
      const result = await safeJson(res, 'Failed to fix design');
      if (!res.ok) throw new Error(result.error || 'Failed to fix design');
      return result;
    }
  });
}

export function useRefineDesign() {
  return useMutation({
    mutationFn: async (instruction: string) => {
      const res = await safeFetch('/api/refine-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction })
      });
      const result = await safeJson(res, 'Failed to refine design');
      if (!res.ok) throw new Error(result.error || 'Failed to refine design');
      return result;
    }
  });
}

export function useSipQuantities(designId: string | null, sizeId: string | null, sipThicknessId: string | null) {
  return useQuery({
    queryKey: ['sip-quantities', designId, sizeId, sipThicknessId],
    enabled: !!designId && !!sizeId && !!sipThicknessId,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await safeFetch('/api/sip-quantities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId, sizeId, sipThicknessId }),
      });
      const result = await safeJson(res, 'Failed to fetch SIP quantities');
      if (!res.ok) throw new Error(result.error || 'Failed to fetch SIP quantities');
      return result as SipQuantitiesResult;
    },
  });
}

export interface SipPanelCut {
  position: number; cutWidthMm: number; cutHeightMm: number;
  stockWidthMm: number; stockLengthMm: number;
  wasteWidthMm: number; wasteHeightMm: number;
  netAreaM2: number; grossAreaM2: number; isRemnant: boolean;
}
export interface SipFaceSchedule {
  face: string; widthMm: number; heightMm: number;
  stockLengthMm: number; totalPanels: number; fullPanels: number; remnantPanels: number;
  grossAreaM2: number; openingAreaM2: number; netAreaM2: number;
  panels: SipPanelCut[];
}
export interface SipQuantitiesResult {
  buildingRef: string; sipSpec: string; wallThicknessMm: number;
  outerW: number; outerL: number; frontH: number; backH: number;
  openings: { name: string; widthMm: number; heightMm: number; areaM2: number }[];
  faces: SipFaceSchedule[];
  splines: {
    panelJoints: {
      joints: { face: string; joints: number; lengthMm: number; totalMm: number }[];
      roofJoints: { face: string; joints: number; lengthMm: number; totalMm: number };
      totalLinearMm: number;
    };
    solePlate:     { description: string; totalLinearMm: number };
    headPlate:     { description: string; totalLinearMm: number };
    cornerSplines: { description: string; totalLinearMm: number };
  };
  totals: { totalPanels: number; grossAreaM2: number; openingAreaM2: number; netAreaM2: number; weightKg: number };
}

export function useDesignStatus() {
  return useQuery({
    queryKey: ['design-status'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/design-status');
        const result = await res.json();
        return result as { exists: boolean };
      } catch {
        return { exists: false };
      }
    },
    staleTime: Infinity,
  });
}
