import { AppState, GameSystem } from '../types';

const STORAGE_KEY = 'ordo_rpg_manager_data_v1';

export const DEFAULT_SYSTEMS: GameSystem[] = [
  { id: 'ordem-paranormal', name: 'Ordem Paranormal', description: 'Investigação e horror paranormal.' },
  { id: 'dnd-5e', name: 'D&D 5e', description: 'Fantasia medieval heroica.' },
];

const INITIAL_STATE: AppState = {
  currentUser: null,
  users: [],
  characters: [],
  sessions: [],
  activeSessionId: null,
  currentSystemId: 'ordem-paranormal',
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return INITIAL_STATE;
    return JSON.parse(serialized);
  } catch (e) {
    console.error("Failed to load state", e);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};