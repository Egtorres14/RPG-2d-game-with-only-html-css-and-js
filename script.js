     document.addEventListener('DOMContentLoaded', () => {
            // Utilidades
            const getRandomInt = (max) => Math.floor(Math.random() * max);
            const rollDice = (sides = 6) => getRandomInt(sides) + 1;
            const createElement = (tag, classNames = [], attributes = {}) => {
                const el = document.createElement(tag);
                classNames.forEach(className => el.classList.add(className));
                Object.keys(attributes).forEach(attr => el.setAttribute(attr, attributes[attr]));
                return el;
            };

            // Estado del Juego
            const gameState = {
                gridSize: 4,
                hero: {
                    id: 'hero',
                    name: 'Héroe',
                    PV: 16,
                    maxPV: 16,
                    actions: 0,
                    position: null,
                    element: null,
                    stats: { fuerza: 5, agilidad: 5, poder: 5, armadura: 5 }
                },
                enemies: [
                    { id: 'enemy1', name: 'Enemigo 1', PV: 10, maxPV: 10, position: null, element: null },
                    { id: 'enemy2', name: 'Enemigo 2', PV: 10, maxPV: 10, position: null, element: null }
                ],
                turn: 'hero', // o 'enemy'
                actionLog: document.getElementById('actionLog'),
                combatGrid: document.getElementById('combatGrid'),
                heroInfo: document.getElementById('heroInfo'),
                infoPanel: document.getElementById('infoPanel'),
                diceRolls: document.getElementById('diceRolls'),
                diceContainer: document.getElementById('diceContainer'),
                actionDescription: document.getElementById('actionDescription'),
                successCountElement: document.getElementById('successCount'),
                buttons: {
                    move: document.getElementById('moveButton'),
                    sword: document.getElementById('swordButton'),
                    tech: document.getElementById('techButton'),
                    endTurn: document.getElementById('endTurnButton')
                },
                moveModeActive: false,
                attackModeActive: false,
                selectedEnemy: null,
                occupiedPositions: new Set(),
                dialogue: {
                    steps: [
                        {
                            speaker: 'Héroe',
                            image: 'https://i.namu.wiki/i/N-G-OeiW0WIOnOQuTXWeKsCGlQU3iScosyFkJtjAZ5wn-rwe-wRZgbmQVXGEeZlQFjqze1Qjd4M1UjW41ApDxg.webp',
                            text: 'No puedo creer que me quieran emboscar...'
                        },
                        {
                            speaker: 'Enemigo 1',
                            image: 'https://static.tvtropes.org/pmwiki/pub/images/gammeluo4.png',
                            text: 'Danos todos los tesoros que hayas obtenido de las antiguas ruinas.'
                        }
                    ],
                    currentStep: 0,
                    isCombatStarted: false
                }
            };

            // Referencias a Elementos de Diálogo y Fin de Combate
            const dialogueOverlay = document.getElementById('dialogueOverlay');
            const dialogueImage = document.getElementById('dialogueImage');
            const dialogueText = document.getElementById('dialogueText');
            const dialogueNextButton = document.getElementById('dialogueNextButton');
            const dialogueFightButton = document.getElementById('dialogueFightButton');

            const combatEndOverlay = document.getElementById('combatEndOverlay');
            const restartButton = document.getElementById('restartButton');

            // Verificación de Elementos en gameState (opcional para depuración)
            console.log('actionLog:', gameState.actionLog);
            console.log('combatGrid:', gameState.combatGrid);
            console.log('heroInfo:', gameState.heroInfo);
            console.log('infoPanel:', gameState.infoPanel);
            console.log('diceRolls:', gameState.diceRolls);

            // Generar Grilla de Combate Dinámicamente
            const initializeGrid = () => {
                for (let x = 0; x < gameState.gridSize; x++) {
                    for (let y = 0; y < gameState.gridSize; y++) {
                        const cell = createElement('div', ['combat-cell'], { 'data-x': x, 'data-y': y });
                        gameState.combatGrid.appendChild(cell);
                    }
                }
            };

            // Verificar si una posición está ocupada
            const isOccupied = ({ x, y }) => gameState.occupiedPositions.has(`${x},${y}`);

            // Asignar posición a una entidad
            const setPosition = (entity, position) => {
                if (entity.position) {
                    gameState.occupiedPositions.delete(`${entity.position.x},${entity.position.y}`);
                    const prevCell = getCell(entity.position);
                    if (prevCell && entity.element) {
                        prevCell.classList.remove('occupied');
                        prevCell.removeChild(entity.element);
                    }
                }
                entity.position = position;
                gameState.occupiedPositions.add(`${position.x},${position.y}`);
                const cell = getCell(position);
                if (cell && entity.element) {
                    cell.classList.add('occupied');
                    cell.appendChild(entity.element);
                }
            };

            const getCell = ({ x, y }) => document.querySelector(`.combat-cell[data-x="${x}"][data-y="${y}"]`);

            // Crear entidad (héroe o enemigo)
            const createEntity = (entity) => {
                const img = createElement('img', [entity.id === 'hero' ? 'hero' : 'enemy'], {
                    src: entity.id === 'hero'
                        ? 'https://i.namu.wiki/i/N-G-OeiW0WIOnOQuTXWeKsCGlQU3iScosyFkJtjAZ5wn-rwe-wRZgbmQVXGEeZlQFjqze1Qjd4M1UjW41ApDxg.webp'
                        : 'https://static.tvtropes.org/pmwiki/pub/images/gammeluo4.png',
                    id: `${entity.id}Img`
                });
                // Añadir barra de vida
                const healthBar = createElement('div', ['health-bar'], {});
                const healthFill = createElement('div', ['health-fill']);
                if (entity.id !== 'hero') {
                    healthFill.classList.add('enemigo');
                }
                healthBar.appendChild(healthFill);
                img.appendChild(healthBar);
                entity.element = img;
                return img;
            };

            // Inicializar entidades en el juego
            const initializeEntities = () => {
                // Inicializar Héroe
                createEntity(gameState.hero);
                const heroPos = getRandomPosition();
                setPosition(gameState.hero, heroPos);
                updateHealthBar(gameState.hero);

                // Inicializar Enemigos
                gameState.enemies.forEach(enemy => {
                    createEntity(enemy);
                    const enemyPos = getRandomPosition();
                    setPosition(enemy, enemyPos);
                    updateHealthBar(enemy);
                });
            };

            const getRandomPosition = () => {
                let position;
                do {
                    position = { x: getRandomInt(gameState.gridSize), y: getRandomInt(gameState.gridSize) };
                } while (isOccupied(position) || (gameState.hero.position && position.x === gameState.hero.position.x && position.y === gameState.hero.position.y));
                return position;
            };

            // Registrar acciones en el log
            const logAction = (message) => {
                const p = createElement('p');
                p.textContent = message;
                gameState.actionLog.appendChild(p);
                gameState.actionLog.scrollTop = gameState.actionLog.scrollHeight;
            };

            // Resaltar celdas adyacentes a una posición
            const highlightAdjacent = (position) => {
                const directions = [
                    { x: position.x + 1, y: position.y },
                    { x: position.x - 1, y: position.y },
                    { x: position.x, y: position.y + 1 },
                    { x: position.x, y: position.y - 1 }
                ];

                directions.forEach(direction => {
                    if (direction.x >= 0 && direction.x < gameState.gridSize && direction.y >= 0 && direction.y < gameState.gridSize) {
                        const cell = getCell(direction);
                        if (cell) {
                            cell.classList.add('highlighted');
                        }
                    }
                });
            };

            const clearHighlights = () => {
                document.querySelectorAll('.combat-cell').forEach(cell => cell.classList.remove('highlighted', 'movable', 'attackable', 'selected-attack'));
            };

            // Actualizar estados de los botones de acción
            const updateActionButtons = () => {
                const { move, sword, tech, endTurn } = gameState.buttons;
                if (gameState.turn === 'hero') {
                    if (!gameState.moveModeActive && !gameState.attackModeActive) {
                        move.disabled = gameState.hero.actions < 2;
                        sword.disabled = gameState.hero.actions < 2;
                        tech.disabled = gameState.hero.actions < 3;
                        endTurn.disabled = false;
                    } else {
                        // Si está en modo de movimiento o ataque, solo permitir cancelar
                        move.disabled = false; // Permitir cancelar
                        sword.disabled = true;
                        tech.disabled = true;
                        endTurn.disabled = true;
                    }
                } else {
                    // No es el turno del héroe, deshabilitar todos los botones
                    move.disabled = true;
                    sword.disabled = true;
                    tech.disabled = true;
                    endTurn.disabled = true;
                }
            };

            // Mostrar lanzamientos de dados
            const displayDiceRolls = (numberOfDice) => {
                gameState.diceContainer.innerHTML = '';
                for (let i = 0; i < numberOfDice; i++) {
                    const dice = createElement('div', ['dice'], {});
                    dice.textContent = '?';
                    gameState.diceContainer.appendChild(dice);
                }
            };

            const updateDice = (index, value) => {
                const dice = gameState.diceContainer.children[index];
                if (dice) {
                    dice.textContent = value;
                }
            };

            const applyDiceStyles = (index, value) => {
                const dice = gameState.diceContainer.children[index];
                if (!dice) return;
                if (value === 6) {
                    dice.classList.add('success');
                } else if (value === 1) {
                    dice.classList.add('failure');
                }
            };

            // Actualizar la barra de vida
            const updateHealthBar = (entity) => {
                const healthFill = entity.element.querySelector('.health-fill');
                if (healthFill) {
                    const porcentaje = (entity.PV / entity.maxPV) * 100;
                    healthFill.style.width = `${porcentaje}%`;
                }
            };

            // Mostrar indicadores de daño y animaciones
            const showDamageIndicator = (damage, position) => {
                if (damage <= 0) return;
                const cell = getCell(position);
                if (!cell) return;
                const damageEl = createElement('div', ['damage-indicator'], {});
                damageEl.textContent = `-${damage}`;
                cell.appendChild(damageEl);
                setTimeout(() => {
                    if (cell.contains(damageEl)) {
                        cell.removeChild(damageEl);
                    }
                }, 1500);
            };

            const showAnimation = (text, className) => {
                const anim = createElement('div', [className], {});
                anim.textContent = text;
                document.body.appendChild(anim);
                setTimeout(() => {
                    if (document.body.contains(anim)) {
                        document.body.removeChild(anim);
                    }
                }, 1000);
            };

            const applyDamageEffect = (entity) => {
                const el = document.getElementById(`${entity.id}Img`);
                if (el) {
                    el.classList.add('damaged');
                    setTimeout(() => el.classList.remove('damaged'), 1000);
                }
            };

            // Movimiento de entidades
            const moveEntity = (entity, x, y) => {
                setPosition(entity, { x, y });
                logAction(`${entity.name} se movió a (${x}, ${y})`);
                clearHighlights();
                highlightAdjacent(entity.position);
            };

            // Funciones de acción del héroe
            const heroMove = () => {
                if (gameState.moveModeActive) {
                    // Cancelar modo de movimiento
                    gameState.moveModeActive = false;
                    clearHighlights();
                    logAction('Acción de movimiento del Héroe cancelada.');
                    gameState.actionDescription.textContent = 'Selecciona una acción';
                } else {
                    if (gameState.hero.actions < 2) {
                        logAction('No hay suficientes acciones para mover.');
                        return;
                    }
                    gameState.moveModeActive = true;
                    logAction('El Héroe está intentando moverse...');
                    gameState.actionDescription.textContent = 'Selecciona una casilla para moverte o vuelve a clicar Movimiento para cancelar.';
                    // Resaltar celdas movibles
                    const { x, y } = gameState.hero.position;
                    const directions = [
                        { x: x + 1, y: y },
                        { x: x - 1, y: y },
                        { x: x, y: y + 1 },
                        { x: x, y: y - 1 }
                    ];

                    directions.forEach(pos => {
                        if (pos.x >= 0 && pos.x < gameState.gridSize && pos.y >= 0 && pos.y < gameState.gridSize && !isOccupied(pos)) {
                            const cell = getCell(pos);
                            if (cell) {
                                cell.classList.add('movable');
                                cell.addEventListener('click', () => {
                                    // Realizar movimiento y gastar acciones
                                    moveEntity(gameState.hero, pos.x, pos.y);
                                    gameState.hero.actions -= 2;
                                    document.getElementById('heroActions').textContent = gameState.hero.actions;
                                    gameState.moveModeActive = false;
                                    clearHighlights();
                                    updateActionButtons();
                                }, { once: true });
                            }
                        }
                    });
                }
                updateActionButtons();
            };

            const heroAttack = (attackType) => {
                if (gameState.attackModeActive) {
                    // Cancelar modo de ataque
                    gameState.attackModeActive = false;
                    clearHighlights();
                    logAction(`Acción de ataque con ${attackType} del Héroe cancelada.`);
                    gameState.actionDescription.textContent = 'Selecciona una acción';
                } else {
                    let actionCost = 0;
                    let damage = 0;

                    if (attackType === 'ESPADA') {
                        actionCost = 2;
                        damage = 3;
                    } else if (attackType === 'TECNICA X') {
                        actionCost = 3;
                        damage = 5;
                    }

                    if (gameState.hero.actions < actionCost) {
                        logAction(`No hay suficientes acciones para realizar ${attackType}.`);
                        return;
                    }

                    gameState.attackModeActive = true;
                    logAction(`El Héroe está intentando realizar ${attackType}...`);
                    gameState.actionDescription.textContent = `Selecciona un enemigo para atacar con ${attackType} o vuelve a clicar ${attackType} para cancelar.`;

                    // Encontrar enemigos adyacentes
                    const targets = gameState.enemies.filter(enemy => {
                        const distance = Math.abs(gameState.hero.position.x - enemy.position.x) + Math.abs(gameState.hero.position.y - enemy.position.y);
                        return distance === 1;
                    });

                    if (targets.length === 0) {
                        logAction('No hay enemigos en rango para atacar.');
                        gameState.attackModeActive = false;
                        gameState.actionDescription.textContent = 'Selecciona una acción';
                        updateActionButtons();
                        return;
                    }

                    // Resaltar celdas con enemigos adyacentes
                    targets.forEach(enemy => {
                        const cell = getCell(enemy.position);
                        if (cell) {
                            cell.classList.add('attackable');
                            cell.addEventListener('click', () => {
                                // Realizar el ataque al enemigo seleccionado
                                performAttack(enemy, damage, attackType);
                                // Gastar acciones
                                gameState.hero.actions -= actionCost;
                                document.getElementById('heroActions').textContent = gameState.hero.actions;
                                // Limpiar resaltados
                                clearHighlights();
                                gameState.attackModeActive = false;
                                updateActionButtons();
                            }, { once: true });
                        }
                    });

                    logAction(`El Héroe puede atacar a ${targets.length} enemigo${targets.length > 1 ? 's' : ''}. Selecciona el objetivo.`);
                }
                updateActionButtons();
            };

            const performAttack = (enemy, baseDamage, attackType) => {
                // Realizar el lanzamiento de dados para el ataque
                const agility = gameState.hero.stats.agilidad;
                const attackSuccesses = rollAttackDice(agility);

                // Calcular daño total
                let totalDamage = baseDamage + attackSuccesses;

                // Aplicar daño al enemigo
                const actualDamage = Math.min(totalDamage, enemy.PV);
                enemy.PV -= actualDamage;
                document.getElementById(`${enemy.id}PVInfo`).textContent = enemy.PV;
                logAction(`El Héroe atacó a ${enemy.name} con ${attackType}, causando ${actualDamage} daño. ${enemy.name} tiene ${enemy.PV} PV restantes.`);
                showDamageIndicator(actualDamage, enemy.position);
                applyDamageEffect(enemy);
                updateHealthBar(enemy);

                // Verificar si el enemigo ha muerto
                if (enemy.PV <= 0) {
                    logAction(`${enemy.name} ha sido derrotado!`);

                    // Eliminar el elemento del enemigo del DOM
                    const cell = getCell(enemy.position);
                    if (cell && enemy.element) {
                        cell.removeChild(enemy.element);
                    }

                    // Eliminar la posición del enemigo del conjunto de posiciones ocupadas
                    gameState.occupiedPositions.delete(`${enemy.position.x},${enemy.position.y}`);

                    // Eliminar el enemigo de la lista de enemigos en gameState
                    gameState.enemies = gameState.enemies.filter(e => e.id !== enemy.id);

                    // Eliminar el elemento que muestra los PV del enemigo
                    const enemyPVElement = document.getElementById(`${enemy.id}PVInfo`);
                    if (enemyPVElement) {
                        enemyPVElement.parentElement.remove(); // Eliminar el párrafo que muestra los PV
                    }
                }

                // Verificar si todos los enemigos han sido derrotados
                if (gameState.enemies.length === 0) {
                    logAction('¡Todos los enemigos han sido derrotados! ¡Victoria!');
                    // Mostrar mensaje de fin de combate
                    showCombatEndMessage();
                }
            };

            const rollAttackDice = (agility) => {
                let successes = 0;
                const rollResults = [];

                displayDiceRolls(agility);

                for (let i = 0; i < agility; i++) {
                    const roll = rollDice();
                    rollResults.push(roll);
                    updateDice(i, roll);
                    applyDiceStyles(i, roll);
                    if (roll === 6) successes++;
                    else if (roll === 1) {
                        showAnimation('¡FALLASTE!', 'attack-fail-animation');
                    }
                }

                // Manejar repeticiones
                const counts = rollResults.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
                Object.entries(counts).forEach(([roll, count]) => {
                    if (count > 1 && roll !== '1') {
                        successes += count;
                        for (let i = 0; i < gameState.diceContainer.children.length; i++) {
                            if (rollResults[i] == roll) {
                                const dice = gameState.diceContainer.children[i];
                                dice.classList.add(roll === '6' ? 'repeat-six' : 'repeat');
                            }
                        }
                    }
                });

                gameState.successCountElement.textContent = `Éxitos: ${successes}`;
                return successes;
            };

            const rollActions = () => {
                const actions = rollAttackDice(5);
                gameState.hero.actions = actions;
                document.getElementById('heroActions').textContent = actions;
                logAction(`El Héroe ha acumulado ${actions} acciones para este turno.`);
                updateActionButtons();
            };

            // Gestión de turnos
            const startHeroTurn = () => {
                gameState.turn = 'hero';
                logAction('El turno del Héroe ha comenzado.');
                gameState.actionDescription.textContent = 'Lanzando dados para acciones del Héroe';
                rollActions();
            };

            const endHeroTurn = () => {
                logAction('El Héroe ha terminado su turno.');
                setTimeout(startEnemyTurn, 1000);
            };

            const startEnemyTurn = () => {
                gameState.turn = 'enemy';
                logAction('El turno de los Enemigos ha comenzado.');
                gameState.actionDescription.textContent = 'Los Enemigos están tomando su turno';

                gameState.enemies.forEach((enemy, index) => {
                    if (enemy.PV > 0) {
                        setTimeout(() => {
                            moveEnemyTowardsHero(enemy);
                            attackHeroIfAdjacent(enemy);
                        }, index * 2000); // Escalonar acciones de enemigos
                    }
                });

                setTimeout(() => {
                    logAction('El turno de los Enemigos ha terminado.');
                    if (gameState.hero.PV > 0) startHeroTurn();
                }, gameState.enemies.length * 2000 + 1000);
            };

            const moveEnemyTowardsHero = (enemy) => {
                const { x: ex, y: ey } = enemy.position;
                const { x: hx, y: hy } = gameState.hero.position;
                let newX = ex, newY = ey;

                // Calcular diferencia en posiciones
                const deltaX = hx - ex;
                const deltaY = hy - ey;

                // Mover una casilla hacia el Héroe
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    newX += deltaX > 0 ? 1 : -1;
                } else if (Math.abs(deltaY) > 0) {
                    newY += deltaY > 0 ? 1 : -1;
                }

                // Asegurar posición válida y no ocupada
                if (newX >= 0 && newX < gameState.gridSize && newY >= 0 && newY < gameState.gridSize && !isOccupied({ x: newX, y: newY })) {
                    moveEntity(enemy, newX, newY);
                } else {
                    logAction(`${enemy.name} no puede moverse más cerca.`);
                }
            };

            const attackHeroIfAdjacent = (enemy) => {
                const distance = Math.abs(enemy.position.x - gameState.hero.position.x) + Math.abs(enemy.position.y - gameState.hero.position.y);
                if (distance === 1) {
                    const damage = Math.max(0, 2 + rollDice(6) - gameState.hero.stats.armadura);
                    gameState.hero.PV = Math.max(0, gameState.hero.PV - damage);
                    document.getElementById('heroPVStats').textContent = gameState.hero.PV;
                    document.getElementById('heroPVInfo').textContent = gameState.hero.PV;
                    logAction(`${enemy.name} atacó al Héroe causando ${damage} daño! El Héroe tiene ${gameState.hero.PV} PV restantes.`);
                    showAnimation('¡ATAQUE!', 'attack-animation');
                    showDamageIndicator(damage, gameState.hero.position);
                    applyDamageEffect(gameState.hero);
                    updateHealthBar(gameState.hero);

                    if (gameState.hero.PV <= 0) {
                        logAction('¡El Héroe ha sido derrotado! Fin del Juego.');
                        // Deshabilitar botones de acción
                        gameState.buttons.move.disabled = true;
                        gameState.buttons.sword.disabled = true;
                        gameState.buttons.tech.disabled = true;
                        gameState.buttons.endTurn.disabled = true;
                        gameState.actionDescription.textContent = '¡Has sido derrotado!';
                    }
                }
            };

            // Configurar escuchadores de eventos para botones
            const setupEventListeners = () => {
                gameState.buttons.move.addEventListener('click', heroMove);
                gameState.buttons.sword.addEventListener('click', () => heroAttack('ESPADA'));
                gameState.buttons.tech.addEventListener('click', () => heroAttack('TECNICA X'));
                gameState.buttons.endTurn.addEventListener('click', endHeroTurn);

                // Escuchador para el botón de siguiente en diálogos
                dialogueNextButton.addEventListener('click', () => {
                    advanceDialogue();
                });

                // Escuchador para el botón de pelear en diálogos
                dialogueFightButton.addEventListener('click', () => {
                    startCombat();
                });

                // Escuchador para reiniciar combate
                restartButton.addEventListener('click', () => {
                    restartCombat();
                });
            };

            // Inicializar combate
            const initializeCombat = () => {
                logAction('¡El combate ha comenzado!');
                initializeGrid();
                initializeEntities();
                updateActionButtons();
                setupEventListeners();
                startDialogue();
            };

            // Sistema de Diálogo
            const startDialogue = () => {
                gameState.dialogue.currentStep = 0;
                dialogueOverlay.style.display = 'flex';
                showDialogueStep();
            };

            const showDialogueStep = () => {
                if (gameState.dialogue.currentStep < gameState.dialogue.steps.length) {
                    const step = gameState.dialogue.steps[gameState.dialogue.currentStep];
                    dialogueImage.src = step.image;
                    dialogueText.textContent = `${step.speaker}: "${step.text}"`;

                    // Mostrar u ocultar botones según el paso
                    if (gameState.dialogue.currentStep === gameState.dialogue.steps.length - 1) {
                        dialogueNextButton.style.display = 'none';
                        dialogueFightButton.style.display = 'inline-block';
                    } else {
                        dialogueNextButton.style.display = 'inline-block';
                        dialogueFightButton.style.display = 'none';
                    }
                }
            };

            const advanceDialogue = () => {
                gameState.dialogue.currentStep++;
                if (gameState.dialogue.currentStep < gameState.dialogue.steps.length) {
                    showDialogueStep();
                } else {
                    // Finalizar diálogo y comenzar combate
                    dialogueOverlay.style.display = 'none';
                    startCombat();
                }
            };

            const startCombat = () => {
                gameState.dialogue.isCombatStarted = true;
                // Ocultar el diálogo
                dialogueOverlay.style.display = 'none';
                // Mostrar el registro de acciones y otros elementos de combate
                gameState.actionLog.style.display = 'block';
                gameState.combatGrid.style.display = 'grid';
                gameState.heroInfo.style.display = 'block';
                gameState.infoPanel.style.display = 'block';
                gameState.diceRolls.style.display = 'flex';
                highlightAdjacent(gameState.hero.position);
                startHeroTurn();
            };

            // Mostrar mensaje de fin de combate
            const showCombatEndMessage = () => {
                combatEndOverlay.style.display = 'flex';
            };

            // Reiniciar combate
            const restartCombat = () => {
                location.reload();
            };

            // Iniciar el combate cuando la página cargue
            initializeCombat();
        });