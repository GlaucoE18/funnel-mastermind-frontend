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
        .then(data => {
            renderResult(emailResults, data, true);
        })
        .catch(error => {
            console.error('Erro ao criar e-mail:', error);
            emailResults.innerHTML = '<div class="upload-error">Erro ao criar e-mail. Por favor, tente novamente.</div>';
        });
    });
}

// Renderiza resultados de análise ou e-mail
function renderResult(container, data, isEmail = false) {
    container.innerHTML = '';
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-container';
    
    // Formata o resultado com markdown básico
    let content = data.answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\n/g, '<br>');
    
    let resultHTML = `
        <h3>${isEmail ? 'E-mail Gerado' : 'Análise do Funil'}</h3>
        <div class="result-content">${content}</div>
    `;
    
    // Adiciona fontes, se existirem
    if (data.sources && data.sources.length > 0) {
        resultHTML += '<div class="sources">';
        resultHTML += '<h4>Fontes:</h4><ul>';
        data.sources.forEach(source => {
            if (source.title) {
                resultHTML += `<li>${source.title}</li>`;
            }
        });
        resultHTML += '</ul></div>';
    }
    
    // Adiciona botão para download no caso de e-mail
    if (isEmail) {
        resultHTML += `
            <button class="download-btn" id="download-email">
                Baixar E-mail
            </button>
        `;
    }
    
    resultDiv.innerHTML = resultHTML;
    container.appendChild(resultDiv);
    
    // Configura botão de download de e-mail
    if (isEmail) {
        document.getElementById('download-email').addEventListener('click', () => {
            const emailText = data.answer;
            const blob = new Blob([emailText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'email_f4.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

// Event Listeners
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (userInput) {
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Carrega ícone do cérebro
function loadBrainIcon() {
    // Criamos um SVG simples para o ícone do cérebro
    const svgContent = `
    <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M208 368V480H304V368" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M256 368V416" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M368 152C397.464 152 421.5 176.036 421.5 205.5C421.5 215.446 418.564 224.773 413.5 232.5C431.5 241 444 259.5 444 281C444 311 421 336 389.5 336H329.66" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M176.5 336H112.5C81 336 58 311 58 281C58 259.5 70.5 241 88.5 232.5C83.436 224.773 80.5 215.446 80.5 205.5C80.5 176.036 104.536 152 134 152" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M338 180.9C338 131.8 298.1 92 249 92C213.3 92 182.4 114.9 170 147" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M170.7 153.3C170.9 153.3 170.8 153.2 170.7 153.3V153.3Z" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M337.3 278.3C339 269.7 340 260.6 340 251.2C340 214.5 319.4 182.5 289.5 166" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M176.7 152.6C175.6 153.1 174.6 153.7 173.7 154.3C192.5 180.8 202.5 214.4 202.5 251.1C202.5 261.8 201.3 272.2 199.1 282" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M222.5 352H289.5" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M250 274C250 302.719 250 336 250 336" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M294 274H206C206 274 206 251.864 206 230C206 190 222 176 256 176C290 176 308 194 308 230C308 251.864 294 274 294 274Z" stroke="#a29bfe" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    `;

    // Cria um blob e URL para o SVG
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Define como src para a imagem
    const img = document.querySelector('.logo img');
    if (img) {
        img.src = url;
        img.alt = "Brain Icon";
    }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    loadBrainIcon();
    
    // Carrega documentos inicialmente, se estiver na aba correta
    if (document.querySelector('.tab-btn[data-tab="upload"]').classList.contains('active')) {
        loadDocuments();
    }
});
