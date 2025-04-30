// API URL - Substitua pela URL da sua API no Render
const API_URL = 'https://funnel-mastermind-api.onrender.com';

// Elementos DOM
const tabs = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('pdf-file');
const fileName = document.querySelector('.file-name');
const uploadStatus = document.getElementById('upload-status');
const documentsContainer = document.getElementById('documents-container');
const funnelForm = document.getElementById('funnel-form');
const funnelResults = document.getElementById('funnel-results');
const emailForm = document.getElementById('email-form');
const emailResults = document.getElementById('email-results');

// Troca de abas
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active das outras abas
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        // Adiciona active na aba clicada
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Carrega documentos quando acessar a aba de upload
        if (tabId === 'upload') {
            loadDocuments();
        }
    });
});

// Envia mensagem no chat
function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Adiciona mensagem do usuário ao chat
    addMessageToChat('user', message);
    userInput.value = '';
    
    // Adiciona indicador de "pensando..."
    const thinkingId = 'thinking-' + Date.now();
    addMessageToChat('assistant', 'Pensando...', thinkingId);
    
    // Chama a API
    fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: message })
    })
    .then(response => response.json())
    .then(data => {
        // Remove o indicador de "pensando..."
        const thinkingMessage = document.getElementById(thinkingId);
        if (thinkingMessage) thinkingMessage.remove();
        
        // Adiciona resposta do assistente
        let answer = data.answer;
        
        // Adiciona fontes, se existirem
        if (data.sources && data.sources.length > 0) {
            answer += '\n\n**Fontes:**\n';
            data.sources.forEach(source => {
                if (source.title) {
                    answer += `- ${source.title}\n`;
                }
            });
        }
        
        addMessageToChat('assistant', answer);
    })
    .catch(error => {
        console.error('Erro ao processar pergunta:', error);
        
        // Remove o indicador de "pensando..."
        const thinkingMessage = document.getElementById(thinkingId);
        if (thinkingMessage) thinkingMessage.remove();
        
        addMessageToChat('assistant', 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.');
    });
}

// Adiciona mensagem ao chat
function addMessageToChat(role, text, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    if (id) messageDiv.id = id;
    
    // Converte markdown para HTML (básico)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(messageDiv);
    
    // Rola para a última mensagem
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Configura exibição do nome do arquivo selecionado
if (fileInput) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileName.textContent = fileInput.files[0].name;
        } else {
            fileName.textContent = 'Nenhum arquivo selecionado';
        }
    });
}

// Upload de documento
if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) {
            showUploadMessage('Por favor, selecione um arquivo PDF.', 'error');
            return;
        }
        
        const title = document.getElementById('doc-title').value;
        const author = document.getElementById('doc-author').value;
        const category = document.getElementById('doc-category').value;
        
        // Cria FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        if (author) formData.append('author', author);
        if (category) formData.append('category', category);
        
        // Mostra status de carregamento
        showUploadMessage('Processando documento...', 'loading');
        
        // Faz upload do documento
        fetch(`${API_URL}/documents/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showUploadMessage(`Documento '${title}' processado com sucesso! Foram criados ${data.chunk_count} fragmentos de conhecimento.`, 'success');
                
                // Limpa formulário
                uploadForm.reset();
                fileName.textContent = 'Nenhum arquivo selecionado';
                
                // Recarrega lista de documentos
                loadDocuments();
            } else {
                showUploadMessage(`Erro ao processar documento: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            console.error('Erro no upload:', error);
            showUploadMessage('Erro ao processar documento. Por favor, tente novamente.', 'error');
        });
    });
}

// Mostra mensagem de status do upload
function showUploadMessage(message, type) {
    uploadStatus.innerHTML = '';
    const messageDiv = document.createElement('div');
    
    if (type === 'success') {
        messageDiv.className = 'upload-success';
    } else if (type === 'error') {
        messageDiv.className = 'upload-error';
    } else if (type === 'loading') {
        messageDiv.className = 'loading';
    }
    
    messageDiv.textContent = message;
    uploadStatus.appendChild(messageDiv);
}

// Carrega documentos da base de conhecimento
function loadDocuments() {
    documentsContainer.innerHTML = '<p class="loading-docs">Carregando documentos...</p>';
    
    fetch(`${API_URL}/documents`)
        .then(response => response.json())
        .then(data => {
            if (data.documents && data.documents.length > 0) {
                documentsContainer.innerHTML = `<p>Total de documentos: ${data.documents.length}</p>`;
                
                data.documents.forEach(doc => {
                    const docItem = document.createElement('div');
                    docItem.className = 'document-item';
                    
                    let docInfo = `<div class="title">${doc.title}</div>`;
                    let meta = [];
                    
                    if (doc.author) meta.push(`Autor: ${doc.author}`);
                    if (doc.category) meta.push(`Categoria: ${doc.category}`);
                    
                    if (meta.length > 0) {
                        docInfo += `<div class="meta">${meta.join(' | ')}</div>`;
                    }
                    
                    docItem.innerHTML = docInfo;
                    documentsContainer.appendChild(docItem);
                });
            } else {
                documentsContainer.innerHTML = '<p>Nenhum documento encontrado na base de conhecimento.</p>';
            }
        })
        .catch(error => {
            console.error('Erro ao carregar documentos:', error);
            documentsContainer.innerHTML = '<p>Erro ao carregar documentos. Por favor, recarregue a página.</p>';
        });
}

// Análise de funis
if (funnelForm) {
    funnelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const description = document.getElementById('funnel-description').value;
        
        // Mostra status de carregamento
        funnelResults.innerHTML = '<div class="loading"></div>';
        
        // Chama a API
        fetch(`${API_URL}/analyze-funnel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description })
        })
        .then(response => response.json())
        .then(data => {
            renderResult(funnelResults, data);
        })
        .catch(error => {
            console.error('Erro ao analisar funil:', error);
            funnelResults.innerHTML = '<div class="upload-error">Erro ao analisar funil. Por favor, tente novamente.</div>';
        });
    });
}

// Criação de e-mails
if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const offer = document.getElementById('email-offer').value;
        const audience = document.getElementById('email-audience').value;
        const objective = document.getElementById('email-objective').value;
        
        // Mostra status de carregamento
        emailResults.innerHTML = '<div class="loading"></div>';
        
        // Chama a API
        fetch(`${API_URL}/create-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ offer, audience, objective })
        })
        .then(response => response.json())
