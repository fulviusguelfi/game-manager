import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DiceRoller } from './components/DiceRoller';
import { loadState, saveState, DEFAULT_SYSTEMS } from './services/storage';
import { generateNPC } from './services/gemini';
import { 
  AppState, 
  User, 
  UserRole, 
  Character, 
  CharacterType, 
  Session,
  ChatMessage
} from './types';

function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [activeTab, setActiveTab] = useState('profile');
  const [tempName, setTempName] = useState('');
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false);

  // Persistence Effect
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Initial routing
  useEffect(() => {
    if (state.currentUser) {
      if (state.activeSessionId) setActiveTab('session');
      else setActiveTab('characters');
    } else {
      setActiveTab('profile');
    }
  }, [state.currentUser, state.activeSessionId]);

  // --- Actions ---

  const handleLogin = (user: User) => {
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('profile');
  };

  const createProfile = (name: string, role: UserRole) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      role
    };
    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUser: newUser
    }));
    setTempName('');
  };

  const createCharacter = (name: string, type: CharacterType, desc: string = '') => {
    if (!state.currentUser) return;
    const newChar: Character = {
      id: crypto.randomUUID(),
      name,
      type,
      ownerId: state.currentUser.id,
      systemId: state.currentSystemId,
      description: desc || 'Novo personagem',
      attributes: [
        { name: "Força", value: 1 },
        { name: "Agilidade", value: 1 },
        { name: "Intelecto", value: 1 },
        { name: "Presença", value: 1 },
        { name: "Vigor", value: 1 }
      ],
      hp: { current: 20, max: 20 },
      san: { current: 20, max: 20 }
    };

    setState(prev => ({
      ...prev,
      characters: [...prev.characters, newChar]
    }));
  };

  const handleGenerateNPC = async () => {
    if (!state.currentUser) return;
    setIsGeneratingNPC(true);
    const systemName = DEFAULT_SYSTEMS.find(s => s.id === state.currentSystemId)?.name || "RPG Genérico";
    
    const npcData = await generateNPC(systemName, state.currentUser.id);
    
    if (npcData) {
      const newChar = { ...npcData, systemId: state.currentSystemId } as Character;
      setState(prev => ({
        ...prev,
        characters: [...prev.characters, newChar]
      }));
    }
    setIsGeneratingNPC(false);
  };

  const startSession = () => {
    if (!state.currentUser || state.currentUser.role !== UserRole.GM) return;
    const newSession: Session = {
      id: crypto.randomUUID(),
      gmId: state.currentUser.id,
      systemId: state.currentSystemId,
      isActive: true,
      activeCharacterIds: [],
      logs: [{
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'Sistema',
        text: `Sessão iniciada em ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
        isSystem: true
      }]
    };
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: newSession.id
    }));
    setActiveTab('session');
  };

  const addToSession = (charId: string) => {
    if (!state.activeSessionId) return;
    setState(prev => {
      const session = prev.sessions.find(s => s.id === prev.activeSessionId);
      if (!session || session.activeCharacterIds.includes(charId)) return prev;
      
      const updatedSession = {
        ...session,
        activeCharacterIds: [...session.activeCharacterIds, charId]
      };
      
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === prev.activeSessionId ? updatedSession : s)
      };
    });
  };

  // --- Views ---

  if (!state.currentUser) {
    return (
      <div className="min-h-screen bg-ordo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-ordo-800 rounded-2xl p-8 border border-ordo-700 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-widest">ORDO MANAGER</h1>
            <p className="text-gray-400">Identifique-se, agente.</p>
          </div>

          <div className="space-y-4">
            {state.users.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Perfis Salvos</h3>
                <div className="grid gap-2">
                  {state.users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleLogin(u)}
                      className="flex items-center justify-between p-3 bg-ordo-700 rounded-lg text-white hover:bg-ordo-500 transition-colors"
                    >
                      <span>{u.name}</span>
                      <span className="text-xs bg-black/30 px-2 py-1 rounded text-gray-300">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-ordo-700 pt-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Novo Perfil</h3>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Nome do Agente"
                className="w-full bg-ordo-900 border border-ordo-700 text-white rounded-lg p-3 mb-3 focus:outline-none focus:border-ordo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => createProfile(tempName, UserRole.PLAYER)}
                  disabled={!tempName}
                  className="flex-1 bg-ordo-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50"
                >
                  Jogador
                </button>
                <button
                  onClick={() => createProfile(tempName, UserRole.GM)}
                  disabled={!tempName}
                  className="flex-1 bg-ordo-500 text-white py-3 rounded-lg font-medium hover:bg-ordo-400 disabled:opacity-50"
                >
                  Mestre
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      userRole={state.currentUser.role}
      onLogout={handleLogout}
    >
      
      {/* --- PROFILE VIEW --- */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-white">Perfil do Agente</h2>
            <p className="text-gray-400">Dados cadastrais e preferências.</p>
          </header>
          
          <div className="bg-ordo-800 p-6 rounded-xl border border-ordo-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-ordo-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {state.currentUser.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{state.currentUser.name}</h3>
                <span className="inline-block px-2 py-1 rounded bg-ordo-900 text-xs text-ordo-400 border border-ordo-700">
                  {state.currentUser.role}
                </span>
              </div>
            </div>
            
            {state.currentUser.role === UserRole.GM && (
              <div className="mt-6 pt-6 border-t border-ordo-700">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Sistema Padrão</h4>
                <select 
                  value={state.currentSystemId}
                  onChange={(e) => setState(prev => ({ ...prev, currentSystemId: e.target.value }))}
                  className="w-full bg-ordo-900 border border-ordo-700 text-white rounded-lg p-3 focus:outline-none focus:border-ordo-500"
                >
                  {DEFAULT_SYSTEMS.map(sys => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Isso define as regras base para novas sessões.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CHARACTERS VIEW --- */}
      {activeTab === 'characters' && (
        <div className="max-w-3xl mx-auto">
           <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Personagens</h2>
              <p className="text-gray-400 text-sm">Gerencie suas fichas.</p>
            </div>
            <button 
              onClick={() => {
                const name = prompt("Nome do personagem:");
                if (name) createCharacter(name, CharacterType.PC);
              }}
              className="bg-ordo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ordo-400"
            >
              + Novo
            </button>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {state.characters
              .filter(c => state.currentUser?.role === UserRole.GM || c.ownerId === state.currentUser?.id)
              .map(char => (
              <div key={char.id} className="bg-ordo-800 p-4 rounded-xl border border-ordo-700 hover:border-ordo-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white">{char.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${char.type === CharacterType.NPC ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                    {char.type}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{char.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-ordo-900 p-2 rounded">
                    <span className="text-gray-500 block">PV</span>
                    <span className="text-white font-mono">{char.hp.current}/{char.hp.max}</span>
                  </div>
                  <div className="bg-ordo-900 p-2 rounded">
                    <span className="text-gray-500 block">SAN</span>
                    <span className="text-white font-mono">{char.san.current}/{char.san.max}</span>
                  </div>
                </div>

                {state.activeSessionId && !state.sessions.find(s => s.id === state.activeSessionId)?.activeCharacterIds.includes(char.id) && (
                  <button 
                    onClick={() => addToSession(char.id)}
                    className="w-full mt-3 bg-ordo-700 hover:bg-green-600 text-white py-2 rounded text-xs transition-colors"
                  >
                    Adicionar à Sessão Atual
                  </button>
                )}
              </div>
            ))}
            {state.characters.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-600">
                Nenhum personagem encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- GM TOOLS VIEW --- */}
      {activeTab === 'gm-tools' && state.currentUser.role === UserRole.GM && (
        <div className="max-w-2xl mx-auto space-y-6">
          <header>
            <h2 className="text-2xl font-bold text-white">Ferramentas do Mestre</h2>
          </header>

          <div className="bg-ordo-800 p-6 rounded-xl border border-ordo-700">
            <h3 className="font-bold text-white mb-4">Controle de Sessão</h3>
            {!state.activeSessionId ? (
              <button 
                onClick={startSession}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-500"
              >
                INICIAR NOVA SESSÃO
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-900/30 border border-green-800 p-3 rounded text-green-400 text-center text-sm">
                  Sessão em andamento
                </div>
                <button 
                  onClick={() => setState(prev => ({ ...prev, activeSessionId: null }))}
                  className="w-full bg-red-900/50 text-red-200 py-3 rounded-lg font-medium hover:bg-red-900 border border-red-800"
                >
                  Pausar Sessão (Salvar)
                </button>
              </div>
            )}
          </div>

          <div className="bg-ordo-800 p-6 rounded-xl border border-ordo-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
            </div>
            <h3 className="font-bold text-white mb-2">Grimório IA</h3>
            <p className="text-xs text-gray-400 mb-4">Gere NPCs instantaneamente compatíveis com o sistema selecionado.</p>
            
            <button
              onClick={handleGenerateNPC}
              disabled={isGeneratingNPC}
              className="w-full bg-purple-900 text-purple-100 border border-purple-700 py-3 rounded-lg font-medium hover:bg-purple-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingNPC ? (
                <span>Invocando entidade...</span>
              ) : (
                <>
                  <span>Gerar NPC Aleatório</span>
                  <span className="text-xs bg-black/30 px-2 rounded">Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- SESSION VIEW --- */}
      {activeTab === 'session' && (
        <div className="h-full flex flex-col md:flex-row gap-4 max-w-6xl mx-auto">
          {activeSession ? (
            <>
              {/* Left Column: Characters in Session */}
              <div className="md:w-2/3 flex flex-col gap-4">
                <header className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Sessão Ativa</h2>
                  <span className="text-xs text-ordo-400 bg-ordo-900 px-2 py-1 rounded border border-ordo-700">
                    {DEFAULT_SYSTEMS.find(s => s.id === activeSession.systemId)?.name}
                  </span>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[60vh] md:max-h-none">
                  {state.characters
                    .filter(c => activeSession.activeCharacterIds.includes(c.id))
                    .map(char => (
                    <div key={char.id} className="bg-ordo-800 p-3 rounded-lg border border-ordo-700 flex flex-col gap-2">
                       <div className="flex justify-between">
                          <span className="font-bold text-white truncate">{char.name}</span>
                          <span className="text-xs text-gray-500">{char.type}</span>
                       </div>
                       
                       {/* Health Bars */}
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                             <span className="w-6 text-red-400 font-bold">PV</span>
                             <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600" style={{ width: `${(char.hp.current / char.hp.max) * 100}%` }}></div>
                             </div>
                             <span className="text-gray-300 w-8 text-right">{char.hp.current}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                             <span className="w-6 text-blue-400 font-bold">SAN</span>
                             <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600" style={{ width: `${(char.san.current / char.san.max) * 100}%` }}></div>
                             </div>
                             <span className="text-gray-300 w-8 text-right">{char.san.current}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                  {activeSession.activeCharacterIds.length === 0 && (
                     <div className="col-span-full bg-ordo-800/50 p-6 rounded-lg border border-dashed border-ordo-700 text-center text-gray-500 text-sm">
                        Mesa vazia. Adicione personagens na aba "Personagens".
                     </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dice & Tools */}
              <div className="md:w-1/3 flex flex-col gap-4">
                <DiceRoller />
                
                {/* Simplified Chat/Log Placeholder */}
                <div className="bg-ordo-800 flex-1 rounded-xl border border-ordo-700 p-4 flex flex-col min-h-[300px]">
                  <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Log da Sessão</h3>
                  <div className="flex-1 bg-ordo-900 rounded-lg p-3 overflow-y-auto text-sm space-y-2 no-scrollbar">
                    {activeSession.logs.map(log => (
                      <div key={log.id} className="text-gray-300">
                        <span className="text-ordo-500 font-bold text-xs">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>{' '}
                        {log.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div className="w-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                <h2 className="text-2xl text-white font-bold">Nenhuma Sessão Ativa</h2>
                <p className="text-gray-400">O mestre precisa iniciar a sessão na aba de ferramentas.</p>
             </div>
          )}
        </div>
      )}

    </Layout>
  );
}

export default App;