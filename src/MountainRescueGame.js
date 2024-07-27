import React, { useState, useEffect, useCallback } from 'react';
import { Play } from 'lucide-react';

const GRID_SIZE = 12;
const CLIMBER_PROBABILITY = 0.08;
const ROCK_PROBABILITY = 0.05;
const GAME_DURATION = 120;
const CLIMBER_HEALTH_DEPLETION_RATE = 2; // Adjust this value to make health decrease more rapidly
const SNOW_FALL_INTERVAL = 2000;

const ROLE_EMOJIS = {
  snowplow: '🚜',
  medic: '⚕️',
  carrier: '🚁'
};

const Cell = ({ content, health, playerEmoji }) => {
  let cellContent = '';
  let cellClass = 'w-10 h-10 rounded-lg shadow-md flex items-center justify-center relative overflow-hidden';

  switch (content) {
    case 'snowplow': cellContent = '🚜'; cellClass += ' bg-blue-400'; break;
    case 'medic': cellContent = '⚕️'; cellClass += ' bg-red-400'; break;
    case 'carrier': cellContent = '🚁'; cellClass += ' bg-yellow-400'; break;
    case 'snow': cellContent = '❄️'; cellClass += ' bg-white'; break;
    case 'climber': cellContent = health > 0 ? '🧗' : '💀'; cellClass += ' bg-green-400'; break;
    case 'rock': cellContent = '🪨'; cellClass += ' bg-gray-500'; break;
    default: cellClass += ' bg-blue-100';
  }

  return (
    <div className={cellClass}>
      <span className="text-2xl">{playerEmoji || cellContent}</span>
      {content === 'climber' && health !== undefined && health > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div className="h-full bg-red-500" style={{ width: `${health}%` }}></div>
        </div>
      )}
    </div>
  );
};

const RoleButton = ({ role, currentRole, onClick }) => {
  const buttonClass = `w-full p-3 rounded-lg shadow-md transition-all duration-300 ${
    currentRole === role ? 'bg-blue-500 text-white scale-105' : 'bg-white hover:bg-blue-100'
  }`;
  const emoji = ROLE_EMOJIS[role];
  return (
    <button className={buttonClass} onClick={() => onClick(role)}>
      <span className="text-2xl mr-2">{emoji}</span>
      <span className="capitalize">{role}</span>
    </button>
  );
};

const MountainRescueGame = () => {
  const [grid, setGrid] = useState([]);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const [currentRole, setCurrentRole] = useState('snowplow');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [totalClimbers, setTotalClimbers] = useState(0);
  const [rescuedClimbers, setRescuedClimbers] = useState(0);
  const [totalRescuedHealth, setTotalRescuedHealth] = useState(0);
  const [snowPlowed, setSnowPlowed] = useState(0);
  const [totalSnow, setTotalSnow] = useState(0);

  const initializeGrid = useCallback(() => {
    let climberCount = 0;
    let snowCount = 0;
    const newGrid = Array(GRID_SIZE).fill().map(() =>
      Array(GRID_SIZE).fill().map(() => {
        if (Math.random() < ROCK_PROBABILITY) return { content: 'rock' };
        if (Math.random() < CLIMBER_PROBABILITY) {
          climberCount++;
          return { content: 'climber', health: 100 };
        }
        snowCount++;
        return { content: 'snow' };
      })
    );
    newGrid[0][0] = { content: 'snowplow' };
    setGrid(newGrid);
    setPlayerPosition({ x: 0, y: 0 });
    setTotalClimbers(climberCount);
    setTotalSnow(snowCount);
  }, []);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const addNewSnow = useCallback(() => {
    setGrid((prevGrid) => {
      const newGrid = [...prevGrid];
      const emptyCells = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (newGrid[y][x].content === null) {
            emptyCells.push({ x, y });
          }
        }
      }
      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        newGrid[randomCell.y][randomCell.x] = { content: 'snow' };
        setTotalSnow(prev => prev + 1);
      }
      return newGrid;
    });
  }, []);

  const checkGameOver = useCallback(() => {
    const hasLiveClimbers = grid.some(row => 
      row.some(cell => cell.content === 'climber' && cell.health > 0)
    );
    return timeLeft <= 0 || !hasLiveClimbers;
  }, [timeLeft, grid]);

  useEffect(() => {
    if (gameActive && gameStarted) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1 || checkGameOver()) {
            clearInterval(timer);
            setGameActive(false);
            return 0;
          }
          return prevTime - 1;
        });
        setGrid((prevGrid) => {
          return prevGrid.map((row) =>
            row.map((cell) => {
              if (cell.content === 'climber' && cell.health > 0) {
                return {
                  ...cell,
                  health: Math.max(0, cell.health - CLIMBER_HEALTH_DEPLETION_RATE),
                };
              }
              return cell;
            })
          );
        });
      }, 1000);

      const snowTimer = setInterval(addNewSnow, SNOW_FALL_INTERVAL);

      return () => {
        clearInterval(timer);
        clearInterval(snowTimer);
      };
    }
  }, [gameActive, gameStarted, addNewSnow, checkGameOver]);

  const movePlayer = (dx, dy) => {
    if (!gameActive || !gameStarted) return;

    const newX = Math.max(0, Math.min(GRID_SIZE - 1, playerPosition.x + dx));
    const newY = Math.max(0, Math.min(GRID_SIZE - 1, playerPosition.y + dy));

    const targetCell = grid[newY][newX];
    const currentCell = grid[playerPosition.y][playerPosition.x];

    if (
      targetCell.content === 'rock' ||
      (targetCell.content === 'snow' && currentRole !== 'snowplow') ||
      (targetCell.content === 'climber' && !['medic', 'carrier'].includes(currentRole))
    ) {
      return;
    }

    setPlayerPosition({ x: newX, y: newY });
    const newGrid = [...grid];

    if (currentCell.content !== 'climber') {
      newGrid[playerPosition.y][playerPosition.x] = { content: null };
    }

    if (currentRole === 'snowplow' && targetCell.content === 'snow') {
      setScore((prevScore) => prevScore + 1);
      setSnowPlowed(prev => prev + 1);
    } else if (currentRole === 'medic' && targetCell.content === 'climber') {
      newGrid[newY][newX] = { ...targetCell, health: 100 };
      setScore((prevScore) => prevScore + 5);
    } else if (currentRole === 'carrier' && targetCell.content === 'climber') {
      setScore((prevScore) => prevScore + targetCell.health);
      setRescuedClimbers(prev => prev + 1);
      setTotalRescuedHealth(prev => prev + targetCell.health);
      newGrid[newY][newX] = { content: null };
    }

    setGrid(newGrid);

    if (checkGameOver()) {
      setGameActive(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!gameActive || !gameStarted) return;
    switch (e.key) {
      case 'ArrowUp': movePlayer(0, -1); break;
      case 'ArrowDown': movePlayer(0, 1); break;
      case 'ArrowLeft': movePlayer(-1, 0); break;
      case 'ArrowRight': movePlayer(1, 0); break;
      default: break;
    }
  };

  const changeRole = (newRole) => {
    setCurrentRole(newRole);
  };

  const startGame = () => {
    setGameActive(true);
    setGameStarted(true);
  };

  const averageRescuedHealth = rescuedClimbers > 0 ? (totalRescuedHealth / rescuedClimbers).toFixed(2) : 0;

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-200 to-purple-200 min-h-screen font-sans" onKeyDown={handleKeyDown} tabIndex="0">
      <h1 className="text-4xl font-bold mb-8 text-blue-800">Mountain Rescue</h1>
      <div className="flex gap-8">
        <div className="grid grid-cols-12 gap-1 p-4 bg-white rounded-xl shadow-lg">
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <Cell 
                key={`${x}-${y}`} 
                content={cell.content} 
                health={cell.health}
                playerEmoji={(x === playerPosition.x && y === playerPosition.y) ? ROLE_EMOJIS[currentRole] : null}
              />
            ))
          )}
        </div>
        <div className="flex flex-col w-48 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-blue-800">Roles</h2>
            <div className="space-y-2">
              <RoleButton role="snowplow" currentRole={currentRole} onClick={changeRole} />
              <RoleButton role="medic" currentRole={currentRole} onClick={changeRole} />
              <RoleButton role="carrier" currentRole={currentRole} onClick={changeRole} />
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <div className="flex-1 bg-white p-4 rounded-full shadow-lg text-center">
              <p className="text-sm font-bold text-blue-800">Score</p>
              <p className="text-2xl font-bold text-blue-600">{score}</p>
            </div>
            <div className="flex-1 bg-white p-4 rounded-full shadow-lg text-center">
              <p className="text-sm font-bold text-blue-800">Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          {!gameStarted && (
            <button onClick={startGame} className="p-4 bg-green-500 text-white rounded-xl shadow-md hover:bg-green-600 transition-colors duration-300 flex items-center justify-center">
              <Play size={24} className="mr-2" /> Start Game
            </button>
          )}
        </div>
      </div>
      {!gameActive && gameStarted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-2xl">
            <h2 className="text-2xl font-bold mb-4 text-blue-800">Game Over</h2>
            <p className="text-lg mb-2">Your final score: {score}</p>
            <p className="text-lg mb-2">Climbers rescued: {rescuedClimbers}/{totalClimbers}</p>
            <p className="text-lg mb-2">Average health of rescued climbers: {averageRescuedHealth}%</p>
            <p className="text-lg mb-2">Snow plowed: {snowPlowed}/{totalSnow}</p>
            <p className="text-lg mb-4">Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
            <button onClick={() => window.location.reload()} className="mt-4 p-3 bg-blue-500 text-white rounded-xl shadow-md hover:bg-blue-600 transition-colors duration-300">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MountainRescueGame;
