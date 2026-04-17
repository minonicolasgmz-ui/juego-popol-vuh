import React, { useState, useEffect, useRef } from 'react';
import { Zap, Brain, Swords, RefreshCw, Info, Play, UserX, X, RotateCcw } from 'lucide-react';

// --- ESTILOS CSS INYECTADOS PARA EFECTOS ---
const customStyles = `
  @keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
  }
  .shake-effect { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
  
  @keyframes floatUp {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-50px) scale(1.5); }
  }
  .damage-float {
    position: absolute; color: #ff3333; font-weight: 900; font-size: 2rem;
    text-shadow: 0 0 10px black; pointer-events: none; z-index: 100;
    animation: floatUp 1s ease-out forwards;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- MOTOR DE SONIDO RETRO (AudioContext) ---
const playSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'attack') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'error') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'play') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        }
    } catch (e) { console.log("Audio not supported", e); }
};

// --- DATA: CARTAS ---
const BASE_CARDS = [
    { id: 'c1', name: 'Hunahpú e Ixbalanqué', faction: 'Héroes', color: 'bg-blue-900 border-blue-400', cost: 3, fd: 5, pc: 7, as: 10, img: '🏹', lore: { general: "Los Gemelos Divinos, destinados a restaurar el orden.", as: "Vencieron a Xibalbá usando intelecto, no fuerza." } },
    { id: 'c2', name: 'Vucub-Caquix', faction: 'Soberbios', color: 'bg-red-950 border-red-500', cost: 4, fd: 10, pc: 2, as: 2, img: '🦚', lore: { general: "Arrogante que se proclamó el Sol. Su vanidad fue su perdición.", fd: "Fuerza abrumadora, pero astucia nula." } },
    { id: 'c3', name: 'Ixmucané', faction: 'Progenitores', color: 'bg-emerald-950 border-emerald-400', cost: 2, fd: 1, pc: 10, as: 8, img: '🫔', lore: { general: "Abuela del Alba. Molió el maíz para hacer a los humanos.", pc: "Su poder creador moldeó la carne humana." } },
    { id: 'c4', name: 'Hun-Camé', faction: 'Xibalbá', color: 'bg-purple-950 border-purple-500', cost: 4, fd: 8, pc: 5, as: 9, img: '💀', lore: { general: "Juez Supremo del inframundo. Adora humillar a los vivos.", as: "Creador de trampas y cuartos de tortura." } },
    { id: 'c5', name: 'Huracán', faction: 'Progenitores', color: 'bg-teal-950 border-teal-300', cost: 5, fd: 10, pc: 10, as: 5, img: '🌪️', lore: { general: "El Corazón del Cielo. Una de las fuerzas primordiales.", fd: "Capaz de desatar un diluvio apocalíptico." } },
    { id: 'c6', name: 'Zipacná', faction: 'Soberbios', color: 'bg-orange-950 border-orange-600', cost: 3, fd: 9, pc: 4, as: 2, img: '🏔️', lore: { general: "Hijo de Vucub-Caquix. Cargaba montañas en su espalda.", fd: "Fuerza titánica; murió aplastado por su propio peso." } },
    { id: 'c7', name: 'Balam-Quitzé', faction: 'Hombres', color: 'bg-yellow-900 border-yellow-500', cost: 2, fd: 5, pc: 5, as: 7, img: '🐆', lore: { general: "Uno de los primeros hombres de maíz.", as: "Lideró a su tribu en la oscuridad esperando el sol." } },
    { id: 'c8', name: 'Señores Búhos', faction: 'Xibalbá', color: 'bg-indigo-950 border-indigo-400', cost: 1, fd: 4, pc: 4, as: 8, img: '🦉', lore: { general: "Mensajeros del inframundo.", as: "Engañan a sus presas para llevarlas a la muerte." } }
];

const ITEM_TYPES = [
    { type: 'corn', emoji: '🌽', points: 1 },
    { type: 'wood', emoji: '🪵', points: -2 },
    { type: 'mud', emoji: '🟤', points: -1 }
];

// --- COMPONENTE: MINIJUEGO DE COSECHA ---
function CosechaPaxil({ player, onFinish }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [items, setItems] = useState([]);
    const [basketPos, setBasketPos] = useState(50);

    const gameAreaRef = useRef(null);
    const requestRef = useRef();

    const BASKET_WIDTH = 25;
    const ITEM_SPEED = 1.5;
    const SPAWN_RATE = 400;

    const startGame = () => {
        playSound('play');
        setIsPlaying(true);
        setScore(0);
        setTimeLeft(15);
        setItems([]);
    };

    const handleTouchMove = (e) => {
        if (!gameAreaRef.current) return;
        const touch = e.touches ? e.touches[0] : e;
        const rect = gameAreaRef.current.getBoundingClientRect();
        let newPos = ((touch.clientX - rect.left) / rect.width) * 100;
        newPos = Math.max(BASKET_WIDTH / 2, Math.min(100 - BASKET_WIDTH / 2, newPos));
        setBasketPos(newPos);
    };

    useEffect(() => {
        if (!isPlaying) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsPlaying(false);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const spawner = setInterval(() => {
            const randomItem = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
            setItems(prev => [...prev, {
                id: Math.random().toString(),
                x: Math.random() * 80 + 10,
                y: -10,
                ...randomItem
            }]);
        }, SPAWN_RATE);

        return () => { clearInterval(timer); clearInterval(spawner); };
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) return;
        const updatePhysics = () => {
            setItems(prevItems => {
                let newItems = [];
                prevItems.forEach(item => {
                    const newY = item.y + ITEM_SPEED;
                    // Colisión con la canasta
                    if (newY > 80 && newY < 95) {
                        const distanceX = Math.abs(item.x - basketPos);
                        if (distanceX < BASKET_WIDTH / 2 + 8) {
                            setScore(s => Math.max(0, s + item.points));
                            if (item.points > 0) playSound('coin');
                            else playSound('error');

                            if (window.navigator.vibrate) window.navigator.vibrate(item.points > 0 ? 30 : 100);
                            return;
                        }
                    }
                    if (newY < 105) newItems.push({ ...item, y: newY });
                });
                return newItems;
            });
            requestRef.current = requestAnimationFrame(updatePhysics);
        };
        requestRef.current = requestAnimationFrame(updatePhysics);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, basketPos]);

    if (!isPlaying && timeLeft === 0) {
        // La puntuación ES el maná. Máximo 10, Mínimo 1.
        const earnedMana = Math.max(1, Math.min(10, score));
        return (
            <div className= "flex flex-col items-center justify-center min-h-[100dvh] overscroll-none touch-none bg-slate-950 text-white p-6 text-center select-none w-full h-[100dvh] absolute inset-0 z-50" >
            <h2 className="text-4xl font-bold text-yellow-500 mb-2" >¡Cosecha Terminada! </h2>
                < div className = "text-6xl mb-4" >🌽</div>
                    < p className = "text-slate-300 mb-6 text-lg" > Atrapaste { score } maíces sagrados.</p>
                        < div className = "bg-slate-900 p-6 rounded-xl border-2 border-slate-700 shadow-xl w-full max-w-sm" >
                            <div className="text-xl text-yellow-400 font-bold mb-6" >
            ¡Jugador { player } comenzará con < span className = "text-3xl text-white" > { earnedMana } </span> de Energía!
            </div>
            < button onClick = {() => { playSound('play'); onFinish(earnedMana); }
    } className = "w-full py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl shadow-lg active:scale-95" >
        { player === 1 ? 'Pasar al Jugador 2' : 'Ir a la Batalla'
}
</button>
    </div>
    </div>
    );
  }

return (
    <div className= "flex flex-col min-h-[100dvh] w-full bg-slate-950 relative select-none touch-none overscroll-none absolute inset-0 z-50 overflow-hidden" >
    <div className="bg-slate-900 p-4 flex justify-between items-center z-10 border-b border-slate-800" >
        <div className="flex items-center gap-2 text-yellow-500 font-bold text-2xl" >🌽 { score } </div>
            < div className = "text-slate-400 font-bold" > Jugador { player } </div>
                < div className = "text-slate-300 font-mono text-xl font-bold bg-slate-800 px-3 py-1 rounded-lg" >
          00: { timeLeft.toString().padStart(2, '0') }
</div>
    </div>

{
    !isPlaying && timeLeft === 15 && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm" >
            <h2 className="text-4xl font-black text-yellow-500 mb-2" > Jugador { player } </h2>
                < h3 className = "text-2xl text-white mb-4" > La Cosecha de Paxil </h3>
                    < p className = "text-slate-300 mb-8 max-w-xs" >
                        Atrapa el maíz(🌽) moviendo la canasta. < br /> <br/>
                            < strong className = "text-yellow-400" >¡Tu puntuación será tu Energía inicial para la batalla de cartas! < /strong> <br/ > <br/>
            Esquiva la madera(🪵) y el barro(🟤).
          </p>
        < button onClick = { startGame } className = "px-10 py-5 bg-yellow-600 hover:bg-yellow-500 rounded-full font-bold text-2xl shadow-[0_0_20px_rgba(202,138,4,0.5)] flex items-center gap-3 active:scale-95 text-white" >
            <Play fill="currentColor" size = { 28} /> Comenzar
                </button>
                </div>
      )
}

<div 
        ref={ gameAreaRef }
className = "flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-800"
onMouseMove = { handleTouchMove }
onTouchMove = { handleTouchMove }
    >
{
    items.map(item => (
        <div key= { item.id } className = "absolute text-5xl transform -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" style = {{ left: `${item.x}%`, top: `${item.y}%` }} >
    { item.emoji }
    </div>
        ))}
<div 
          className="absolute bottom-8 h-20 bg-gradient-to-b from-yellow-700 to-yellow-900 border-t-4 border-yellow-500 rounded-b-2xl rounded-t flex items-center justify-center shadow-2xl"
style = {{ left: `${basketPos}%`, width: `${BASKET_WIDTH}%`, transform: 'translateX(-50%)' }}
        >
    <div className="text-4xl mt-[-15px]" >🫔</div>
        </div>
        </div>
        </div>
  );
}

// --- COMPONENTE CARTA ---
const Card = ({ card, onClick, isSelected, showActions, onAction, onInfo, hidden = false }) => {
    if (hidden) {
        return (
            <div className= "w-[72px] h-[100px] md:w-32 md:h-48 rounded-xl bg-slate-800 border-2 border-slate-600 shadow-lg flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 to-slate-900 shrink-0" >
            <div className="text-2xl opacity-20" >🎴</div>
                </div>
    );
  }

return (
    <div 
      onClick= { onClick }
className = {`relative rounded-xl border-2 shadow-xl shrink-0 transition-transform cursor-pointer overflow-hidden
        ${card.color} ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-2 z-20 scale-105' : 'z-10'}
        w-[90px] h-[130px] md:w-32 md:h-48 flex flex-col items-center p-1 md:p-2 text-center text-slate-200 select-none`}
    >
    <div className="absolute top-0 left-0 bg-yellow-500 text-black font-black text-[10px] md:text-xs px-1.5 py-0.5 rounded-br-lg z-10 flex items-center shadow-md" >
        { card.cost }🌽
</div>
    < div className = "absolute top-0 right-0 bg-slate-800/80 p-1 rounded-bl-lg z-10 hover:bg-slate-700" onClick = {(e) => { e.stopPropagation(); onInfo(card); }}>
        <Info size={ 12 } className = "text-slate-300 md:w-4 md:h-4" />
            </div>

            {card.imageUrl ? (
                <div className="w-full h-16 md:h-24 mt-2 mb-1 flex items-center justify-center overflow-hidden px-1 shrink-0">
                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover rounded shadow-md border border-slate-700/50" />
                </div>
            ) : (
                <div className="text-3xl md:text-4xl mt-3 mb-1 filter drop-shadow-md">{card.img}</div>
            )}
                < div className = "font-bold text-[9px] md:text-sm leading-tight line-clamp-2 w-full" > { card.name } </div>
                    < div className = "text-[8px] md:text-[10px] text-gray-400 uppercase tracking-tighter w-full truncate" > { card.faction } </div>

                        < div className = "mt-auto w-full flex justify-between px-1 bg-black/50 rounded py-0.5" >
                            <div className="flex flex-col items-center" > <Swords size={ 12 } className = "text-red-400" /> <span className="font-bold text-[10px] text-red-300" > { card.fd } < /span></div >
                                <div className="flex flex-col items-center" > <Zap size={ 12 } className = "text-blue-400" /> <span className="font-bold text-[10px] text-blue-300" > { card.pc } < /span></div >
                                    <div className="flex flex-col items-center" > <Brain size={ 12 } className = "text-emerald-400" /> <span className="font-bold text-[10px] text-emerald-300" > { card.as } < /span></div >
                                        </div>

{
    showActions && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2 z-30" >
            <button onClick={ (e) => { e.stopPropagation(); onAction('fd'); } } className = "p-1.5 md:p-2 bg-red-600 rounded-full shadow-lg" > <Swords size={ 16 } color = "white" /> </button>
                < button onClick = {(e) => { e.stopPropagation(); onAction('pc'); }
} className = "p-1.5 md:p-2 bg-blue-600 rounded-full shadow-lg" > <Zap size={ 16 } color = "white" /> </button>
    < button onClick = {(e) => { e.stopPropagation(); onAction('as'); }} className = "p-1.5 md:p-2 bg-emerald-600 rounded-full shadow-lg" > <Brain size={ 16 } color = "white" /> </button>
        </div>
      )}
</div>
  );
};

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
    const [gameState, setGameState] = useState('menu'); // menu, minigame, transition, playing, gameover

    // Estado del Minijuego
    const [minigamePlayer, setMinigamePlayer] = useState(1);
    const [p1ManaScore, setP1ManaScore] = useState(1);

    const [turn, setTurn] = useState(1);
    const [players, setPlayers] = useState({
        1: { hp: 20, maxMana: 1, mana: 1, hand: [], board: [], hasPlayedCard: false, hasAttacked: false },
        2: { hp: 20, maxMana: 1, mana: 1, hand: [], board: [], hasPlayedCard: false, hasAttacked: false }
    });
    const [deck, setDeck] = useState([]);
    const [selectedHandCard, setSelectedHandCard] = useState(null);
    const [selectedBoardCard, setSelectedBoardCard] = useState(null);
    const [combatLog, setCombatLog] = useState(["¡Bienvenido a la Creación!"]);
    const [winner, setWinner] = useState(null);

    const [isShaking, setIsShaking] = useState(false);
    const [floatingDamage, setFloatingDamage] = useState({ show: false, val: 0, player: 1 });
    const [infoModal, setInfoModal] = useState(null);

    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = customStyles;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

    const triggerShake = (playerHit, damage) => {
        setIsShaking(true);
        if (damage > 0) setFloatingDamage({ show: true, val: damage, player: playerHit });
        setTimeout(() => { setIsShaking(false); }, 400);
        setTimeout(() => { setFloatingDamage({ show: false, val: 0, player: 1 }); }, 1000);
    };

    const createDeck = () => {
        let newDeck = [];
        for (let i = 0; i < 3; i++) {
            BASE_CARDS.forEach(c => newDeck.push({ ...c, uid: Math.random().toString(36).substr(2, 9) }));
        }
        return newDeck.sort(() => Math.random() - 0.5);
    };

    const logEvent = (msg) => setCombatLog(prev => [msg, ...prev].slice(0, 4));

    // --- TRANSICIONES Y FLUJO ---
    const startMinigames = () => {
        playSound('play');
        setMinigamePlayer(1);
        setGameState('minigame');
    };

    const handleMinigameFinish = (earnedMana) => {
        if (minigamePlayer === 1) {
            setP1ManaScore(earnedMana);
            setMinigamePlayer(2);
        } else {
            initCardGame(p1ManaScore, earnedMana);
        }
    };

    const initCardGame = (mana1, mana2) => {
        const newDeck = createDeck();
        setPlayers({
            1: { hp: 20, maxMana: mana1, mana: mana1, hand: newDeck.slice(0, 5), board: [], hasPlayedCard: false, hasAttacked: false },
            2: { hp: 20, maxMana: mana2, mana: mana2, hand: newDeck.slice(5, 10), board: [], hasPlayedCard: false, hasAttacked: false }
        });
        setDeck(newDeck.slice(10));
        setTurn(1);
        setCombatLog([`J1 empieza con ${mana1}🌽. J2 empieza con ${mana2}🌽.`]);
        setGameState('transition');
    };

    // --- LOGICA DE BATALLA ---
    const endTurn = () => {
        playSound('play');
        const nextTurn = turn === 1 ? 2 : 1;
        let nextPlayer = { ...players[nextTurn] };
        let currentDeck = [...deck];

        if (nextPlayer.hand.length < 6 && currentDeck.length > 0) {
            nextPlayer.hand.push(currentDeck.pop());
        }

        const newMaxMana = Math.min(nextPlayer.maxMana + 1, 10);
        nextPlayer.maxMana = newMaxMana;
        nextPlayer.mana = newMaxMana;
        nextPlayer.hasPlayedCard = false;
        nextPlayer.hasAttacked = false;

        setPlayers(prev => ({ ...prev, [nextTurn]: nextPlayer }));
        setDeck(currentDeck);

        setSelectedHandCard(null);
        setSelectedBoardCard(null);
        setTurn(nextTurn);
        setGameState('transition');
    };

    const playCardToBoard = () => {
        if (selectedHandCard === null || players[turn].hasPlayedCard) return;
        const cardToPlay = players[turn].hand[selectedHandCard];

        if (players[turn].mana < cardToPlay.cost) {
            logEvent(`¡No hay suficiente Maíz (${cardToPlay.cost} req)!`);
            playSound('error');
            return;
        }

        if (players[turn].board.length >= 3) {
            logEvent("Tu tablero está lleno (Máx 3).");
            playSound('error');
            return;
        }

        setPlayers(prev => {
            const newHand = [...prev[turn].hand];
            newHand.splice(selectedHandCard, 1);
            return {
                ...prev,
                [turn]: {
                    ...prev[turn],
                    mana: prev[turn].mana - cardToPlay.cost,
                    hand: newHand,
                    board: [...prev[turn].board, cardToPlay],
                    hasPlayedCard: true
                }
            };
        });

        playSound('play');
        logEvent(`Invocaste a ${cardToPlay.name}.`);
        setSelectedHandCard(null);
    };

    const executeAttack = (stat) => {
        if (selectedBoardCard === null || players[turn].hasAttacked) return;

        const opponent = turn === 1 ? 2 : 1;
        const attackerCard = players[turn].board[selectedBoardCard];

        if (players[opponent].board.length === 0) {
            const damage = attackerCard[stat];
            playSound('hit');
            triggerShake(opponent, damage);

            setPlayers(prev => ({
                ...prev,
                [opponent]: { ...prev[opponent], hp: Math.max(0, prev[opponent].hp - damage) },
                [turn]: { ...prev[turn], hasAttacked: true }
            }));
            logEvent(`¡${attackerCard.name} atacó directamente por ${damage} de daño!`);
            setSelectedBoardCard(null);
            if (players[opponent].hp - damage <= 0) {
                setWinner(turn);
                setGameState('gameover');
            }
        } else {
            playSound('play');
            logEvent(`Selecciona objetivo enemigo para atacar con ${stat.toUpperCase()}`);
            setSelectedBoardCard({ index: selectedBoardCard, stat: stat });
        }
    };

    const resolveCombat = (targetIndex) => {
        if (typeof selectedBoardCard !== 'object' || selectedBoardCard === null) return;

        const opponent = turn === 1 ? 2 : 1;
        const attackerIdx = selectedBoardCard.index;
        const stat = selectedBoardCard.stat;

        const attackerCard = players[turn].board[attackerIdx];
        const defenderCard = players[opponent].board[targetIndex];

        const attVal = attackerCard[stat];
        const defVal = defenderCard[stat];
        const statName = stat === 'fd' ? 'Fuerza' : stat === 'pc' ? 'Magia' : 'Astucia';

        let newAttackerBoard = [...players[turn].board];
        let newDefenderBoard = [...players[opponent].board];

        playSound('attack');

        if (attVal > defVal) {
            logEvent(`¡Victorioso! ${attackerCard.name} eliminó a ${defenderCard.name} en ${statName}.`);
            triggerShake(opponent, 0);
            newDefenderBoard.splice(targetIndex, 1);
        } else if (defVal > attVal) {
            logEvent(`¡Derrota! ${defenderCard.name} fue superior en ${statName}.`);
            triggerShake(turn, 0);
            newAttackerBoard.splice(attackerIdx, 1);
        } else {
            logEvent(`Empate colosal en ${statName}. Ambas deidades fueron destruidas.`);
            triggerShake(1, 0);
            newAttackerBoard.splice(attackerIdx, 1);
            newDefenderBoard.splice(targetIndex, 1);
        }

        setPlayers(prev => ({
            ...prev,
            [turn]: { ...prev[turn], board: newAttackerBoard, hasAttacked: true },
            [opponent]: { ...prev[opponent], board: newDefenderBoard }
        }));
        setSelectedBoardCard(null);
    };

    // --- VISTAS ---
    if (gameState === 'menu') {
        return (
            <div className= "min-h-[100dvh] overscroll-none touch-none bg-slate-950 text-white flex flex-col items-center justify-center p-4" >
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-red-600 mb-2 text-center" > POPOL VUH </h1>
                < p className = "text-slate-400 mb-12 text-sm md:text-lg italic text-center px-4 max-w-md" > "Todo estaba en suspenso, en calma, en silencio..." </p>
                    < button onClick = { startMinigames } className = "px-8 py-4 bg-red-800 rounded-full font-bold text-xl shadow-[0_0_20px_rgba(255,0,0,0.4)] flex gap-2 active:scale-95 transition-transform text-white" >
                        <Play /> Jugar (Local 2P)
                        </button>
                        </div>
    );
    }

    if (gameState === 'minigame') {
        return <CosechaPaxil key={ minigamePlayer } player = { minigamePlayer } onFinish = { handleMinigameFinish } />;
    }

    if (gameState === 'transition') {
        return (
            <div className= "min-h-[100dvh] overscroll-none touch-none bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center select-none" >
            <h2 className="text-4xl font-bold text-yellow-500 mb-4" > Turno del Jugador { turn } </h2>
                < p className = "text-slate-400 mb-8" > Pasa el teléfono al Jugador { turn }. ¡No mires sus cartas! </p>
                    < button onClick = {() => { playSound('play'); setGameState('playing'); }
    } className = "px-8 py-4 bg-slate-800 rounded-xl font-bold border-2 border-slate-600 active:scale-95 flex items-center gap-2 text-xl shadow-lg hover:bg-slate-700" >
        <UserX /> ¡Estoy Listo!
        </button>
        </div>
    );
}

if (gameState === 'gameover') {
    return (
        <div className= "min-h-[100dvh] overscroll-none touch-none bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center" >
        <h2 className="text-5xl font-black text-yellow-500 mb-4" >¡JUGADOR { winner } GANA! </h2>
            < p className = "text-slate-400 mb-8" > Una nueva era ha comenzado.</p>
                < button onClick = {() => setGameState('menu')
} className = "px-6 py-3 bg-slate-800 rounded-lg font-bold border border-slate-600 flex gap-2" >
    <RefreshCw /> Jugar de Nuevo
    </button>
    </div>
    );
  }

// --- VISTA DE JUEGO PRINCIPAL (CARTAS) ---
const opponent = turn === 1 ? 2 : 1;
const isTargeting = typeof selectedBoardCard === 'object' && selectedBoardCard !== null;
const pTurn = players[turn];
const pOpp = players[opponent];

return (
    <div className= {`min-h-[100dvh] max-h-[100dvh] overscroll-none touch-none bg-slate-900 text-slate-100 flex flex-col overflow-hidden select-none ${isShaking ? 'shake-effect' : ''}`}>

        { infoModal && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick = {() => setInfoModal(null)}>
                <div className={ `bg-slate-900 border-2 ${infoModal.color.split(' ')[1]} rounded-2xl p-6 max-w-sm w-full shadow-2xl relative` } onClick = { e => e.stopPropagation() } >
                    <button className="absolute top-3 right-3 text-gray-400 hover:text-white" onClick = {() => setInfoModal(null)}> <X/></button >
                        {infoModal.imageUrl ? (
                            <div className="w-full h-48 mb-4 rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner">
                                <img src={infoModal.imageUrl} alt={infoModal.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="text-4xl text-center mb-2">{infoModal.img}</div>
                        )}
                            < h3 className = "text-xl font-bold text-center text-yellow-500 leading-tight" > { infoModal.name } </h3>
                                < p className = "text-xs text-center text-gray-400 uppercase tracking-wider mb-4" > { infoModal.faction } • Costo: { infoModal.cost }🌽</p>
                                    < div className = "bg-slate-950 p-3 rounded-lg mb-4 text-sm text-slate-300 italic border border-slate-800" >
                                        "{infoModal.lore.general}"
                                        </div>
                                        < div className = "space-y-2" >
                                            <div className="flex gap-2 text-sm" > <Swords size={ 16 } className = "text-red-400 shrink-0" /> <span className="text-slate-300" > { infoModal.lore.fd || "Fuerza Estándar." } < /span></div >
                                                <div className="flex gap-2 text-sm" > <Zap size={ 16 } className = "text-blue-400 shrink-0" /> <span className="text-slate-300" > { infoModal.lore.pc || "Magia Estándar." } < /span></div >
                                                    <div className="flex gap-2 text-sm" > <Brain size={ 16 } className = "text-emerald-400 shrink-0" /> <span className="text-slate-300" > { infoModal.lore.as || "Astucia Estándar." } < /span></div >
                                                        </div>
                                                        </div>
                                                        </div>
      )}

{/* HEADER HP / LOGS */ }
<div className="bg-slate-950 p-2 border-b border-slate-800 flex justify-between items-center text-xs md:text-sm z-10 shrink-0" >
    <div className="truncate text-yellow-400 italic flex-1 mr-2 px-2 py-1 bg-black/50 rounded border border-slate-800 shadow-inner" >
        { combatLog[0]}
        </div>
        < div className = "flex gap-2 font-bold shrink-0" >
            <div className="relative px-3 py-1 bg-red-950/50 border border-red-900 rounded text-red-200" >
                J1 ❤️ { players[1].hp }
{ floatingDamage.show && floatingDamage.player === 1 && <span className="damage-float right-0" > -{ floatingDamage.val } </span> }
</div>
    < div className = "relative px-3 py-1 bg-red-950/50 border border-red-900 rounded text-red-200" >
        J2 ❤️ { players[2].hp }
{ floatingDamage.show && floatingDamage.player === 2 && <span className="damage-float right-0" > -{ floatingDamage.val } </span> }
</div>
    </div>
    </div>

{/* CAMPO DE BATALLA */ }
<div className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] min-h-0" >
    <div className="flex-1 flex flex-col items-center justify-end pb-2 relative border-b-2 border-dashed border-slate-700/50" >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 shadow" >
            Terreno Enemigo
{ pOpp.board.length === 0 && <span className="text-red-500 font-bold ml-1" >¡VULNERABLE! </span> }
</div>
    < div className = "flex gap-2 items-center px-2" >
        {
            pOpp.board.length === 0 ? (
                <div className= "w-[90px] h-[130px] rounded-xl border-2 border-slate-800/50 border-dashed flex items-center justify-center opacity-30 text-xs text-center p-2" > Vacío </div>
             ) : (
                    pOpp.board.map((card, idx) => (
                        <div key= { card.uid } className = { isTargeting? 'ring-4 ring-red-500 rounded-xl animate-pulse cursor-crosshair': '' } onClick = {() => isTargeting && resolveCombat(idx)}>
                    <Card card={ card } onInfo = { setInfoModal } />
                    </div>
                    ))
             )}
</div>
    </div>

    < div className = "flex-1 flex flex-col items-center justify-start pt-2 relative" >
        <div className="flex gap-2 items-center px-2" >
            {
                pTurn.board.length === 0 ? (
                    <div className= "w-[90px] h-[130px] rounded-xl border-2 border-slate-600 border-dashed flex items-center justify-center text-slate-500 text-xs text-center p-2" > Despliega < br /> aquí </div>
             ) : (
                        pTurn.board.map((card, idx) => (
                            <Card 
                    key= { card.uid } card = { card } onInfo = { setInfoModal }
                    onClick = {() => { if(!pTurn.hasAttacked && !isTargeting) setSelectedBoardCard(idx); }}
isSelected = { selectedBoardCard === idx}
showActions = { selectedBoardCard === idx && !isTargeting}
onAction = { executeAttack }
    />
               ))
             )}
</div>
    < div className = "absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-yellow-500/50" > Tu Terreno </div>
        </div>
        </div>

{/* CONTROLES Y MANO */ }
<div className="bg-slate-950 pb-4 pt-2 px-2 border-t border-slate-800 z-20 shrink-0" >
    <div className="flex justify-between items-end mb-2 px-2" >
        <div className="flex flex-col" >
            <span className="text-yellow-500 font-bold text-lg flex items-center gap-1 shadow-sm" >
              🌽 { pTurn.mana } <span className="text-slate-500 text-xs" > / {pTurn.maxMana}</span >
    </span>
    < div className = "flex gap-3 text-[10px] uppercase tracking-wider font-bold text-slate-400" >
        <span className={ pTurn.hasPlayedCard ? 'text-red-900' : 'text-green-500' }> Invocación </span>
            < span className = { pTurn.hasAttacked ? 'text-red-900' : 'text-green-500' } > Ataque </span>
                </div>
                </div>

                < div className = "flex gap-2" >
                    { isTargeting && (
                        <button onClick={ () => setSelectedBoardCard(null) } className = "px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold active:scale-95 border border-slate-700" > Cancelar </button>
            )}
<button onClick={ endTurn } className = "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-500 font-black rounded-lg border border-slate-600 shadow-lg flex items-center gap-2 text-sm active:scale-95" >
    Pasar < RefreshCw size = { 14} />
        </button>
        </div>
        </div>

        < div className = "flex gap-2 overflow-x-auto pb-4 pt-14 px-2 snap-x hide-scrollbar" >
        {
            pTurn.hand.map((card, idx) => (
                <div key= { card.uid } className = "snap-center relative shrink-0" >
                <Card 
                  card={ card } onInfo = { setInfoModal }
                  onClick = {() => !pTurn.hasPlayedCard && setSelectedHandCard(idx === selectedHandCard ? null : idx)}
isSelected = { selectedHandCard === idx}
                />
{
    selectedHandCard === idx && !pTurn.hasPlayedCard && (
        <button 
                    onClick={ playCardToBoard }
    className = {`absolute -top-12 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full font-black text-sm shadow-[0_0_20px_rgba(0,0,0,0.6)] whitespace-nowrap z-50 tracking-wider transition-all border-2 ${pTurn.mana >= card.cost ? 'bg-green-500 border-green-300 text-white animate-bounce' : 'bg-red-800 border-red-500 text-slate-300 opacity-90'}`
}
                  >
    { pTurn.mana >= card.cost ? `BAJAR (-${card.cost}🌽)` : `FALTA 🌽` }
    </button>
                )}
</div>
          ))}
<div className="flex gap-[-20px] ml-auto items-center opacity-30 pointer-events-none pr-4 shrink-0" >
    <div className="text-[10px] text-slate-500 uppercase mr-2 writing-vertical" > Rival({ pOpp.hand.length }) </div>
{ pOpp.hand.map((c, i) => <div key={ i } className = "w-8 h-12 bg-slate-800 border border-slate-700 rounded shadow -ml-4" > </div>) }
</div>
    </div>
    </div>
    </div>
  );
}