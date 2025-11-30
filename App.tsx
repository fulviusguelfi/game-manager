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
  
  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.PLAYER);
  const [authError, setAuthError] = useState('');

  // Session States
  const [sessionNameInput, setSessionNameInput] = useState('');
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

  // --- Auth Actions ---

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const user = state.users.find(u => u.name.toLowerCase() === loginName.toLowerCase());
    
    if (!user) {
      setAuthError('Usuário não encontrado.');
      return;
    }

    // Check password (simple check, allowing legacy users without password to enter if field is empty)
    if (user.password && user.password !== loginPass) {
      setAuthError('Senha incorreta.');
      return;
    }

    setState(prev => ({ ...prev, currentUser: user }));
    setLoginName('');
    setLoginPass('');
  };

  const handleQuickSelect = (user: User) => {
    setLoginName(user.name);
    setAuthMode('login');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!regName || !regPass || !regConfirm) {
      setAuthError('Preencha todos os campos.');
      return;
    }

    if (regPass !== regConfirm) {
      setAuthError('As senhas não coincidem.');
      return;
    }

    if (state.users.some(u => u.name.toLowerCase() === regName.toLowerCase())) {
      setAuthError('Nome de usuário já existe.');
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name: regName,
      role: regRole,
      password: regPass
    };

    setState(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUser: newUser
    }));

    // Reset Form
    setRegName('');
    setRegPass('');
    setRegConfirm('');
    setRegRole(UserRole.PLAYER);
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('profile');
    setAuthMode('login');
  };

  // --- Character Actions ---

  const createCharacter = (name: string) => {
    if (!state.currentUser) return;
    
    // GM creates NPCs by default, Players create PCs by default
    const type = state.currentUser.role === UserRole.GM ? CharacterType.NPC : CharacterType.PC;

    const newChar: Character = {
      id: crypto.randomUUID(),
      name,
      type,
      ownerId: state.currentUser.id,
      systemId: state.currentSystemId,
      description: 'Novo personagem',
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

  const deleteCharacter = (charId: string) => {
    if (!confirm("Tem certeza que deseja apagar este personagem permanentemente?")) return;
    
    setState(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== charId),
      // Also remove from any active session lists
      sessions: prev.sessions.map(s => ({
        ...s,
        activeCharacterIds: s.activeCharacterIds.filter(id => id !== charId)
      }))
    }));
  };

  const changeCharacterOwner = (charId: string, newOwnerId: string) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c => 
        c.id === charId ? { ...c, ownerId: newOwnerId } : c
      )
    }));
  };

  const toggleCharacterType = (charId: string) => {
    setState(prev => ({
      ...prev,
      characters: prev.characters.map(c => {
        if (c.id !== charId) return c;
        return {
          ...c,
          type: c.type === CharacterType.PC ? CharacterType.NPC : CharacterType.PC
        };
      })
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

  // --- Session Actions ---

  const startSession = () => {
    if (!state.currentUser || state.currentUser.role !== UserRole.GM) return;
    if (!sessionNameInput.trim()) {
      alert("Por favor, dê um nome à sessão.");
      return;
    }

    const newSession: Session = {
      id: crypto.randomUUID(),
      name: sessionNameInput,
      gmId: state.currentUser.id,
      systemId: state.currentSystemId, 
      isActive: true,
      activeCharacterIds: [],
      logs: [{
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'Sistema',
        text: `Sessão "${sessionNameInput}" iniciada em ${new Date().toLocaleTimeString()} usando sistema ${DEFAULT_SYSTEMS.find(s => s.id === state.currentSystemId)?.name}`,
        timestamp: Date.now(),
        isSystem: true
      }]
    };
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: newSession.id
    }));
    setSessionNameInput('');
    setActiveTab('session');
  };

  const resumeSession = (sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      setState(prev => ({
        ...prev,
        activeSessionId: sessionId,
        currentSystemId: session.systemId 
      }));
      setActiveTab('session');
    }
  };

  const deleteSession = (sessionId: string) => {
    if (confirm("Tem certeza que deseja apagar esta sessão e todo o histórico dela?")) {
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId),
        activeSessionId: prev.activeSessionId === sessionId ? null : prev.activeSessionId
      }));
    }
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

  const handleDiceRoll = (sides: number, result: number) => {
    if (!state.activeSessionId || !state.currentUser) return;

    const newLog: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: state.currentUser.id,
      senderName: state.currentUser.name,
      text: `Rolou d${sides}: ${result}`,
      timestamp: Date.now(),
      isSystem: false
    };

    setState(prev => {
      const session = prev.sessions.find(s => s.id === prev.activeSessionId);
      if (!session) return prev;
      
      return {
        ...prev,
        sessions: prev.sessions.map(s => 
          s.id === prev.activeSessionId 
            ? { ...s, logs: [newLog, ...s.logs] } // Prepend log
            : s
        )
      };
    });
  };

  // --- Views ---

  if (!state.currentUser) {
    return (
      <div className="min-h-screen bg-ordo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-ordo-800 rounded-2xl p-8 border border-ordo-700 shadow-2xl animate-fade-in">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-widest">ORDO MANAGER</h1>
            <p className="text-gray-400 text-sm">Acesso Restrito. Identifique-se.</p>
          </div>

          {authError && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 text-sm p-3 rounded mb-4 text-center">
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <div className="space-y-6">
              {state.users.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase">Agentes Conhecidos</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto no-scrollbar">
                    {state.users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickSelect(u)}
                        className={`flex flex-col items-start p-2 rounded border transition-colors ${loginName === u.name ? 'bg-ordo-700 border-ordo-500 ring-1 ring-ordo-500' : 'bg-ordo-900 border-ordo-800 hover:bg-ordo-700'}`}
                      >
                        <span className="text-white text-sm font-bold truncate w-full text-left">{u.name}</span>
                        <span className="text-[10px] text-gray-400">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full bg-ordo-900 border border-ordo-700 text-white rounded p-3 focus:outline-none focus:border-ordo-500"
                    placeholder="Agente..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full bg-ordo-900 border border-ordo-700 text-white rounded p-3 focus:outline-none focus:border-ordo-500"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-ordo-500 text-white py-3 rounded font-bold hover:bg-ordo-400 transition-colors shadow-lg shadow-ordo-500/20"
                >
                  ACESSAR SISTEMA
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-gray-500 text-sm">
                  Não possui credenciais?{' '}
                  <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-ordo-400 hover:underline">
                    Solicitar Cadastro
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome de Codinome</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-ordo-900 border border-ordo-700 text-white rounded p-3 focus:outline-none focus:border-ordo-500"
                    placeholder="Seu nome..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole(UserRole.PLAYER)}
                    className={`p-3 rounded border text-sm font-bold transition-colors ${regRole === UserRole.PLAYER ? 'bg-ordo-500 text-white border-ordo-400' : 'bg-ordo-900 text-gray-400 border-ordo-700'}`}
                  >
                    JOGADOR
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole(UserRole.GM)}
                    className={`p-3 rounded border text-sm font-bold transition-colors ${regRole === UserRole.GM ? 'bg-purple-600 text-white border-purple-400' : 'bg-ordo-900 text-gray-400 border-ordo-700'}`}
                  >
                    MESTRE
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Senha</label>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="w-full bg-ordo-900 border border-ordo-700 text-white rounded p-3 focus:outline-none focus:border-ordo-500"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="w-full bg-ordo-900 border border-ordo-700 text-white rounded p-3 focus:outline-none focus:border-ordo-500"
                    placeholder="••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-700 text-white py-3 rounded font-bold hover:bg-green-600 transition-colors"
                >
                  CRIAR CREDENCIAL
                </button>
              </form>

              <div className="text-center pt-2">
                <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-gray-400 hover:text-white text-sm">
                  ← Voltar para Login
                </button>
              </div>
            </div>
          )}
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
          </div>
        </div>
      )}

      {/* --- CHARACTERS VIEW --- */}
      {activeTab === 'characters' && (
        <div className="max-w-3xl mx-auto">
           <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Personagens</h2>
              <p className="text-gray-400 text-sm">
                {state.currentUser.role === UserRole.GM 
                  ? "Gerencie fichas e NPCs." 
                  : "Gerencie suas fichas."}
              </p>
            </div>
            <button 
              onClick={() => {
                const name = prompt("Nome do personagem:");
                if (name) createCharacter(name);
              }}
              className="bg-ordo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ordo-400 shadow-lg shadow-ordo-500/20"
            >
              + Novo {state.currentUser.role === UserRole.GM ? "NPC" : "Personagem"}
            </button>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {state.characters
              .filter(c => {
                 // GM sees all, Players see their own
                 if (state.currentUser?.role === UserRole.GM) return true;
                 return c.ownerId === state.currentUser?.id;
              })
              .map(char => {
                const isOwner = char.ownerId === state.currentUser?.id;
                const ownerName = state.users.find(u => u.id === char.ownerId)?.name || 'Desconhecido';
                
                return (
                  <div key={char.id} className="bg-ordo-800 p-4 rounded-xl border border-ordo-700 hover:border-ordo-500 transition-colors relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <h3 className="font-bold text-white text-lg">{char.name}</h3>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          {isOwner ? "Seu Personagem" : `Dono: ${ownerName}`}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${char.type === CharacterType.NPC ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-800' : 'bg-blue-900/50 text-blue-200 border border-blue-800'}`}>
                          {char.type}
                        </span>
                        
                        {(isOwner || state.currentUser?.role === UserRole.GM) && (
                          <button 
                            onClick={() => deleteCharacter(char.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-4 line-clamp-2 italic border-l-2 border-ordo-700 pl-2">{char.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-ordo-900 p-2 rounded border border-ordo-800">
                        <span className="text-gray-500 block text-[10px] uppercase">Vida</span>
                        <span className="text-white font-mono font-bold">{char.hp.current}/{char.hp.max}</span>
                      </div>
                      <div className="bg-ordo-900 p-2 rounded border border-ordo-800">
                        <span className="text-gray-500 block text-[10px] uppercase">Sanidade</span>
                        <span className="text-white font-mono font-bold">{char.san.current}/{char.san.max}</span>
                      </div>
                    </div>

                    {/* Management Actions */}
                    <div className="space-y-2 border-t border-ordo-700 pt-3">
                      {/* GM Actions */}
                      {state.currentUser?.role === UserRole.GM && (
                        <div className="space-y-2">
                          {char.ownerId === state.currentUser.id ? (
                            <div className="flex gap-2 items-center">
                              <select 
                                className="bg-ordo-900 text-xs text-white border border-ordo-600 rounded p-1 flex-1 max-w-[150px]"
                                onChange={(e) => {
                                  if(e.target.value) changeCharacterOwner(char.id, e.target.value);
                                }}
                                value=""
                              >
                                <option value="" disabled>Transferir para...</option>
                                {state.users.filter(u => u.role === UserRole.PLAYER).map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <button 
                              onClick={() => changeCharacterOwner(char.id, state.currentUser!.id)}
                              className="w-full text-center text-xs bg-red-900/30 text-red-300 py-1 rounded border border-red-900 hover:bg-red-900/50"
                            >
                              Reivindicar NPC (Tomar Posse)
                            </button>
                          )}
                        </div>
                      )}

                      {/* Player Actions */}
                      {state.currentUser?.role === UserRole.PLAYER && isOwner && (
                         <div className="flex gap-2">
                            {char.type === CharacterType.NPC ? (
                               <button 
                                 onClick={() => toggleCharacterType(char.id)}
                                 className="flex-1 text-center text-xs bg-blue-900/30 text-blue-300 py-1 rounded border border-blue-900 hover:bg-blue-900/50"
                               >
                                 Transformar em PC
                               </button>
                            ) : (
                              <button 
                                onClick={() => toggleCharacterType(char.id)}
                                className="flex-1 text-center text-xs bg-yellow-900/30 text-yellow-300 py-1 rounded border border-yellow-900 hover:bg-yellow-900/50"
                              >
                                Transformar em NPC
                              </button>
                            )}
                         </div>
                      )}

                      {state.activeSessionId && 
                       !state.sessions.find(s => s.id === state.activeSessionId)?.activeCharacterIds.includes(char.id) && 
                       (isOwner || state.currentUser.role === UserRole.GM) && (
                        <button 
                          onClick={() => addToSession(char.id)}
                          className="w-full bg-ordo-700 hover:bg-green-600 text-white py-2 rounded text-xs transition-colors font-bold mt-2"
                        >
                          Adicionar à Sessão
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
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
              <div className="space-y-6">
                
                {/* Criar Nova Sessão */}
                <div className="space-y-4 border-b border-ordo-700 pb-6">
                   <h4 className="text-xs text-ordo-400 uppercase font-bold">Criar Nova Sessão</h4>
                   <div>
                      <label className="block text-xs text-gray-400 mb-1">Nome da Sessão</label>
                      <input
                          type="text"
                          value={sessionNameInput}
                          onChange={(e) => setSessionNameInput(e.target.value)}
                          placeholder="Ex: O Segredo na Ilha - Ep. 1"
                          className="w-full bg-ordo-900 border border-ordo-700 text-white rounded-lg p-3 focus:outline-none focus:border-ordo-500"
                      />
                   </div>

                   <div>
                      <label className="block text-xs text-gray-400 mb-1">Sistema do Jogo</label>
                      <select 
                        value={state.currentSystemId}
                        onChange={(e) => setState(prev => ({ ...prev, currentSystemId: e.target.value }))}
                        className="w-full bg-ordo-900 border border-ordo-700 text-white rounded-lg p-3 focus:outline-none focus:border-ordo-500"
                      >
                        {DEFAULT_SYSTEMS.map(sys => (
                          <option key={sys.id} value={sys.id}>{sys.name}</option>
                        ))}
                      </select>
                   </div>
                  
                  <button 
                    onClick={startSession}
                    disabled={!sessionNameInput.trim()}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>INICIAR NOVA SESSÃO</span>
                  </button>
                </div>

                {/* Retomar Sessões Antigas */}
                <div className="space-y-2">
                  <h4 className="text-xs text-gray-500 uppercase font-bold">Retomar Sessão Anterior</h4>
                  {state.sessions.length > 0 ? (
                    <div className="grid gap-2">
                      {state.sessions.map(session => (
                        <div key={session.id} className="bg-ordo-900 p-3 rounded flex items-center justify-between border border-ordo-800">
                          <div className="overflow-hidden">
                            <div className="font-bold text-white truncate">{session.name}</div>
                            <div className="text-[10px] text-gray-500">
                              {DEFAULT_SYSTEMS.find(s => s.id === session.systemId)?.name} • {new Date(session.logs[0]?.timestamp || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => resumeSession(session.id)}
                              className="px-3 py-1 bg-ordo-700 hover:bg-ordo-600 text-white text-xs rounded"
                            >
                              Retomar
                            </button>
                            <button 
                              onClick={() => deleteSession(session.id)}
                              className="px-2 py-1 bg-red-900/40 hover:bg-red-900 text-red-400 text-xs rounded"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 italic">Nenhuma sessão salva encontrada.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-900/30 border border-green-800 p-3 rounded text-green-400 text-center text-sm">
                  <span className="font-bold block mb-1">Sessão Ativa: {activeSession?.name}</span>
                  <span className="text-xs opacity-75">({DEFAULT_SYSTEMS.find(s => s.id === activeSession?.systemId)?.name})</span>
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
            <p className="text-xs text-gray-400 mb-4">Gere NPCs instantaneamente compatíveis com o sistema selecionado acima.</p>
            
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
                  <div>
                    <h2 className="text-xl font-bold text-white">{activeSession.name}</h2>
                    <p className="text-xs text-gray-400">Em andamento</p>
                  </div>
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${char.type === CharacterType.NPC ? 'bg-yellow-900/50 text-yellow-200' : 'bg-blue-900/50 text-blue-200'}`}>
                            {char.type}
                          </span>
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
                <DiceRoller onRoll={handleDiceRoll} />
                
                {/* Simplified Chat/Log Placeholder */}
                <div className="bg-ordo-800 flex-1 rounded-xl border border-ordo-700 p-4 flex flex-col min-h-[300px]">
                  <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Log da Sessão</h3>
                  <div className="flex-1 bg-ordo-900 rounded-lg p-3 overflow-y-auto text-sm space-y-2 no-scrollbar flex flex-col-reverse">
                    {activeSession.logs.map(log => (
                      <div key={log.id} className="text-gray-300">
                        <span className="text-ordo-500 font-bold text-xs">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>{' '}
                        {log.senderName}: {log.text}
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