document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    let nodeCounter = 100001;
    let sceneCounter = 1;
    let draggedNode = null;
    let selectedNode = null;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;
    let nodes = [];
    let connectors = [];
    let scenes = [];
    let entities = [];
    let items = [];
    let deleteMode = false;
    let addConnectorMode = false;
    let startConnectionPoint = null;
    let currentScene = null;

    function showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }

    function promptModal(title, message, callback) {
        const content = `
            <p>${message}</p>
            <input type="text" id="modal-input">
            <button id="modal-submit">Submit</button>
        `;
        
        showModal(title, content);
        
        const input = document.getElementById('modal-input');
        const submit = document.getElementById('modal-submit');
        
        submit.onclick = function() {
            const value = input.value;
            document.getElementById('modal').style.display = 'none';
            callback(value);
        }
    }

    function createNode(type) {
        if (!currentScene) {
            alert("Please select a scene first.");
            return;
        }

        const node = document.createElement('div');
        node.className = 'node';
        const sceneCounterPadded = currentScene.id.toString().padStart(2, '0');
        node.id = `${type}_${sceneCounterPadded}_${nodeCounter}`;
        node.style.left = `${-translateX / scale + 50}px`;
        node.style.top = `${-translateY / scale + 50}px`;
        node.textContent = node.id;
        node.style.borderColor = getNodeColor(type);
        
        const positions = ['top', 'right', 'bottom', 'left'];
        positions.forEach(pos => {
            const point = document.createElement('div');
            point.className = `connection-point ${pos}`;
            point.addEventListener('mousedown', startConnection);
            point.addEventListener('mouseup', endConnection);
            node.appendChild(point);
        });
        
        node.addEventListener('mousedown', (e) => {
            if (deleteMode) {
                deleteNode(node.id);
            } else if (!addConnectorMode) {
                startDraggingNode(e);
            }
        });
        node.addEventListener('touchstart', (e) => {
            if (deleteMode) {
                deleteNode(node.id);
            } else if (!addConnectorMode) {
                startDraggingNode(e);
            }
        });
        canvas.appendChild(node);
        
        nodes.push({
            id: node.id,
            type: type,
            x: -translateX / scale + 50,
            y: -translateY / scale + 50,
            properties: getNodeProperties(type),
            sceneId: currentScene.id
        });
        
        nodeCounter++;
        selectedNode = node;
        updateNodeOptions(node.id);
    }

    function getNodeColor(type) {
        const colors = {
            TXT: '#FF0000',
            TIK: '#00FF00',
            YOU: '#0000FF',
            RUM: '#FFFF00',
            AUD: '#FF00FF',
            ENC: '#00FFFF',
            CHN: '#FFA500',
            INV: '#800080',
            BEG: '#008000',
            END: '#800000',
            SCN: '#008080'
        };
        return colors[type] || '#FFFFFF';
    }

    function getNodeProperties(type) {
        const properties = {
            TXT: { text: '' },
            TIK: { videoUrl: '' },
            YOU: { videoUrl: '' },
            RUM: { videoUrl: '' },
            AUD: { audioUrl: '' },
            ENC: { entity: '', winNode: '', loseNode: '' },
            CHN: { choices: [] },
            INV: { name: '', useType: '', damage: 0, health: 0, image: '' },
            BEG: {},
            END: {},
            SCN: { targetScene: '', targetNode: '' }
        };
        return properties[type] || {};
    }

    function startDraggingNode(e) {
        e.preventDefault();
        draggedNode = e.target.closest('.node');
        selectedNode = draggedNode;
        updateNodeOptions(selectedNode.id);
        const rect = draggedNode.getBoundingClientRect();
        draggedNode.offsetX = (e.clientX || e.touches[0].clientX) - rect.left;
        draggedNode.offsetY = (e.clientY || e.touches[0].clientY) - rect.top;
        
        document.addEventListener('mousemove', dragNode);
        document.addEventListener('mouseup', stopDraggingNode);
        document.addEventListener('touchmove', dragNode);
        document.addEventListener('touchend', stopDraggingNode);
    }

    function dragNode(e) {
        if (draggedNode) {
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            const x = (clientX - draggedNode.offsetX - translateX) / scale;
            const y = (clientY - draggedNode.offsetY - translateY) / scale;
            draggedNode.style.left = `${x}px`;
            draggedNode.style.top = `${y}px`;
            
            const nodeData = nodes.find(n => n.id === draggedNode.id);
            if (nodeData) {
                nodeData.x = x;
                nodeData.y = y;
            }
            
            updateConnectors();
        }
    }

    function stopDraggingNode() {
        draggedNode = null;
        document.removeEventListener('mousemove', dragNode);
        document.removeEventListener('mouseup', stopDraggingNode);
        document.removeEventListener('touchmove', dragNode);
        document.removeEventListener('touchend', stopDraggingNode);
    }

    function updateNodeOptions(nodeId) {
        const nodeData = nodes.find(n => n.id === nodeId);
        if (nodeData) {
            const optionsContainer = document.getElementById('node-options');
            optionsContainer.innerHTML = '';
            
            const title = document.createElement('h3');
            title.textContent = `Options for ${nodeId}`;
            optionsContainer.appendChild(title);
            
            for (const [key, value] of Object.entries(nodeData.properties)) {
                const label = document.createElement('label');
                label.textContent = key;
                const input = document.createElement('input');
                input.type = typeof value === 'number' ? 'number' : 'text';
                input.value = value;
                input.addEventListener('change', (e) => {
                    nodeData.properties[key] = e.target.value;
                });
                optionsContainer.appendChild(label);
                optionsContainer.appendChild(input);
            }
        }
    }

    function startConnection(e) {
        if (addConnectorMode) {
            e.stopPropagation();
            startConnectionPoint = e.target;
        }
    }

    function endConnection(e) {
        if (addConnectorMode && startConnectionPoint && startConnectionPoint !== e.target) {
            e.stopPropagation();
            const endConnectionPoint = e.target;
            const startNodeId = startConnectionPoint.parentNode.id;
            const endNodeId = endConnectionPoint.parentNode.id;
            addConnector(startNodeId, endNodeId);
            startConnectionPoint = null;
        }
    }

    function addConnector(startNodeId, endNodeId) {
        connectors.push({ start: startNodeId, end: endNodeId });
        updateConnectors();
    }

    function updateConnectors() {
        canvas.querySelectorAll('.connector').forEach(el => el.remove());
        
        connectors.forEach(conn => {
            const startNode = document.getElementById(conn.start);
            const endNode = document.getElementById(conn.end);
            if (startNode && endNode) {
                const startRect = startNode.getBoundingClientRect();
                const endRect = endNode.getBoundingClientRect();
                const startPoint = {
                    x: startRect.left + startRect.width / 2,
                    y: startRect.top + startRect.height / 2
                };
                const endPoint = {
                    x: endRect.left + endRect.width / 2,
                    y: endRect.top + endRect.height / 2
                };
                
                const connector = document.createElement('div');
                connector.classList.add('connector');
                
                const length = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
                const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
                
                connector.style.width = `${length}px`;
                connector.style.left = `${startPoint.x}px`;
                connector.style.top = `${startPoint.y}px`;
                connector.style.transform = `rotate(${angle}rad)`;
                
                canvas.appendChild(connector);
            }
        });
    }

    function addScene() {
        promptModal("Add Scene", "Enter scene name:", (sceneName) => {
            if (sceneName) {
                const newScene = { id: sceneCounter, name: sceneName };
                scenes.push(newScene);
                sceneCounter++;
                updateScenesList();
                switchScene(newScene.id);
            }
        });
    }

    function addEntity() {
        promptModal("Add Entity", "Enter entity name:", (entityName) => {
            if (entityName) {
                entities.push({ id: entities.length + 1, name: entityName });
                updateEntitiesList();
            }
        });
    }

    function addItem() {
        promptModal("Add Item", "Enter item name:", (itemName) => {
            if (itemName) {
                items.push({ id: items.length + 1, name: itemName });
                updateItemsList();
            }
        });
    }

    function updateScenesList() {
        const scenesContainer = document.getElementById('scenes-container');
        scenesContainer.innerHTML = '';
        scenes.forEach(scene => {
            const sceneElement = document.createElement('div');
            sceneElement.textContent = scene.name;
            sceneElement.classList.add('sidebar-item');
            sceneElement.addEventListener('click', () => switchScene(scene.id));
            scenesContainer.appendChild(sceneElement);
        });
    }

    function updateEntitiesList() {
        const entitiesContainer = document.getElementById('entities-container');
        entitiesContainer.innerHTML = '';
        entities.forEach(entity => {
            const entityElement = document.createElement('div');
            entityElement.textContent = entity.name;
            entityElement.classList.add('sidebar-item');
            entityElement.addEventListener('click', () => editEntity(entity.id));
            entitiesContainer.appendChild(entityElement);
        });
    }

    function updateItemsList() {
        const itemsContainer = document.getElementById('items-container');
        itemsContainer.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.textContent = item.name;
            itemElement.classList.add('sidebar-item');
            itemElement.addEventListener('click', () => editItem(item.id));
            itemsContainer.appendChild(itemElement);
        });
    }

    function switchScene(sceneId) {
        currentScene = scenes.find(scene => scene.id === sceneId);
        console.log(`Switched to scene: ${currentScene.name}`);
        highlightSelectedItem('scenes-container', sceneId);
        updateCanvasForScene(sceneId);

        // Update the scene counter in the node creation
        const sceneCounterPadded = currentScene.id.toString().padStart(2, '0');
        nodeCounter = parseInt(sceneCounterPadded + '001');
    }

    function updateCanvasForScene(sceneId) {
        nodes.forEach(node => {
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                if (node.sceneId === sceneId) {
                    nodeElement.style.display = 'block';
                } else {
                    nodeElement.style.display = 'none';
                }
            }
        });
        updateConnectors();
    }

    function editEntity(entityId) {
        const entity = entities.find(entity => entity.id === entityId);
        promptModal("Edit Entity", `Edit name for entity "${entity.name}":`, (newName) => {
            if (newName && newName !== entity.name) {
                entity.name = newName;
                updateEntitiesList();
            }
        });
        highlightSelectedItem('entities-container', entityId);
    }

    function editItem(itemId) {
        const item = items.find(item => item.id === itemId);
        promptModal("Edit Item", `Edit name for item "${item.name}":`, (newName) => {
            if (newName && newName !== item.name) {
                item.name = newName;
                updateItemsList();
            }
        });
        highlightSelectedItem('items-container', itemId);
    }

    function highlightSelectedItem(containerId, selectedId) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.sidebar-item').forEach((item, index) => {
            if (index + 1 === selectedId) {  // Assuming IDs start from 1
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function saveStory() {
        const story = {
            nodes: nodes,
            connectors: connectors,
            scenes: scenes,
            entities: entities,
            items: items,
            sceneCounter: sceneCounter,
            nodeCounter: nodeCounter
        };

        const blob = new Blob([JSON.stringify(story)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'story.json';
        a.click();
    }

    function loadStory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const content = readerEvent.target.result;
                const story = JSON.parse(content);
                
                canvas.innerHTML = '';
                nodes = story.nodes;
                connectors = story.connectors;
                scenes = story.scenes;
                entities = story.entities;
                items = story.items;
                sceneCounter = story.sceneCounter;
                nodeCounter = story.nodeCounter;

                nodes.forEach(node => {
                    const newNode = document.createElement('div');
                    newNode.className = 'node';
                    newNode.id = node.id;
                    newNode.style.left = `${node.x}px`;
                    newNode.style.top = `${node.y}px`;
                    newNode.textContent = node.id;
                    newNode.style.borderColor = getNodeColor(node.type);
                    
                    const positions = ['top', 'right', 'bottom', 'left'];
                    positions.forEach(pos => {
                        const point = document.createElement('div');
                        point.className = `connection-point ${pos}`;
                        point.addEventListener('mousedown', startConnection);
                        point.addEventListener('mouseup', endConnection);
                        newNode.appendChild(point);
                    });
                    
                    newNode.addEventListener('mousedown', (e) => {
                        if (deleteMode) {
                            deleteNode(node.id);
                        } else if (!addConnectorMode) {
                            startDraggingNode(e);
                        }
                    });
                    newNode.addEventListener('touchstart', (e) => {
                        if (deleteMode) {
                            deleteNode(node.id);
                        } else if (!addConnectorMode) {
                            startDraggingNode(e);
                        }
                    });
                    canvas.appendChild(newNode);
                });

                updateConnectors();
                updateScenesList();
                updateEntitiesList();
                updateItemsList();
                if (scenes.length > 0) {
                    switchScene(scenes[0].id);
                }
            }
            reader.readAsText(file);
        }
        input.click();
    }

    function testStory() {
        showModal("Test Story", "<p>Story testing functionality not implemented yet.</p>");
    }

    function toggleDeleteMode() {
        deleteMode = !deleteMode;
        document.getElementById('delete').classList.toggle('active-toggle');
    }

    function deleteNode(nodeId) {
        nodes = nodes.filter(node => node.id !== nodeId);
        connectors = connectors.filter(conn => conn.start !== nodeId && conn.end !== nodeId);
        document.getElementById(nodeId).remove();
        updateConnectors();
    }

    function toggleAddConnectorMode() {
        addConnectorMode = !addConnectorMode;
        document.getElementById('add-connector').classList.toggle('active-toggle');
    }

    function createInitialScene() {
        const firstScene = { id: sceneCounter, name: "First Scene" };
        scenes.push(firstScene);
        sceneCounter++;
        updateScenesList();
        switchScene(firstScene.id);
    }

    function updateCanvasTransform() {
        const gridSize = 20; // This should match the background-size in CSS
        const offsetX = (translateX % gridSize + gridSize) % gridSize;
        const offsetY = (translateY % gridSize + gridSize) % gridSize;
        
        canvas.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
        canvas.style.transform = `scale(${scale})`;
        
        // Update positions of all nodes
        nodes.forEach(node => {
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                nodeElement.style.transform = `translate(${translateX / scale}px, ${translateY / scale}px)`;
            }
        });
        
        updateConnectors();
    }

    function zoom(e) {
        e.preventDefault();
        const delta = e.deltaY;
        const scaleChange = delta > 0 ? 0.9 : 1.1;
        const mouseX = e.clientX - canvasContainer.offsetLeft;
        const mouseY = e.clientY - canvasContainer.offsetTop;
        
        const oldScale = scale;
        scale *= scaleChange;
        scale = Math.min(Math.max(0.1, scale), 4);
        
        const scaleRatio = scale / oldScale;
        translateX = mouseX - (mouseX - translateX) * scaleRatio;
        translateY = mouseY - (mouseY - translateY) * scaleRatio;
        
        updateCanvasTransform();
    }

    function startDragging(e) {
        if (e.target === canvas) {
            isDragging = true;
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
        }
    }

    function drag(e) {
        if (isDragging) {
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;
            translateX += dx;
            translateY += dy;
            startX = clientX;
            startY = clientY;
            updateCanvasTransform();
        }
    }

    function stopDragging() {
        isDragging = false;
    }

    canvasContainer.addEventListener('wheel', zoom);
    canvasContainer.addEventListener('mousedown', startDragging);
    canvasContainer.addEventListener('mousemove', drag);
    canvasContainer.addEventListener('mouseup', stopDragging);
    canvasContainer.addEventListener('mouseleave', stopDragging);
    canvasContainer.addEventListener('touchstart', startDragging);
    canvasContainer.addEventListener('touchmove', drag);
    canvasContainer.addEventListener('touchend', stopDragging);

    // Event listeners for buttons
    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            createNode(e.target.getAttribute('data-node-type'));
        });
    });

    document.getElementById('add-connector').addEventListener('click', toggleAddConnectorMode);
    document.getElementById('add-scene').addEventListener('click', addScene);
    document.getElementById('add-entity').addEventListener('click', addEntity);
    document.getElementById('add-item').addEventListener('click', addItem);
    document.getElementById('save-story').addEventListener('click', saveStory);
    document.getElementById('load-story').addEventListener('click', loadStory);
    document.getElementById('test-story').addEventListener('click', testStory);
    document.getElementById('delete').addEventListener('click', toggleDeleteMode);

    canvas.addEventListener('mouseup', () => {
        startConnectionPoint = null;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (addConnectorMode && startConnectionPoint) {
            // You can add visual feedback here, like drawing a temporary line
        }
    });

    canvas.addEventListener('click', (e) => {
        const clickedNode = e.target.closest('.node');
        if (clickedNode) {
            selectedNode = clickedNode;
            updateNodeOptions(selectedNode.id);
        }
    });

    // Create the initial scene
    createInitialScene();
});
