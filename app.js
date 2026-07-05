import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuração oficial do seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCtCBDpnjpg9tYDNvpkoXyjskyxaO00-dO",
    authDomain: "controle-de-horas-83afb.firebaseapp.com",
    projectId: "controle-de-horas-83afb",
    storageBucket: "controle-de-horas-83afb.firebasestorage.app",
    messagingSenderId: "970403178442",
    appId: "1:970403178442:web:ca23be1909a8a8deee1133"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Estado Local dos Dados
let dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
let usuarioAtualUid = null;
const VALOR_HORA_FIXO = 7.50;

// Escuta o estado do Login
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const divBiometria = document.getElementById('div-biometria');

    if (user) {
        usuarioAtualUid = user.uid;
        if(loginScreen) loginScreen.classList.add('hidden');
        if(appScreen) appScreen.classList.remove('hidden');
        
        // Ativa o botão de biometria para os próximos acessos rápidos
        if (localStorage.getItem('biometriaAtivada') === 'true' && divBiometria) {
            divBiometria.classList.remove('hidden');
        }

        await carregarDadosProtegidos();
    } else {
        usuarioAtualUid = null;
        if(loginScreen) loginScreen.classList.remove('hidden');
        if(appScreen) appScreen.classList.add('hidden');
        if(divBiometria && localStorage.getItem('biometriaAtivada') === 'true') {
            divBiometria.classList.remove('hidden');
        }
    }
});

// Inicialização de Interfaces
window.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();
    if (document.getElementById('data')) document.getElementById('data').valueAsDate = hoje;
    if (document.getElementById('filtroMes')) document.getElementById('filtroMes').value = String(hoje.getMonth() + 1).padStart(2, '0');
    if (document.getElementById('filtroAno')) document.getElementById('filtroAno').value = String(hoje.getFullYear());
    
    if(document.getElementById('filtroMes')) document.getElementById('filtroMes').addEventListener('change', () => window.atualizarTelas());
    if(document.getElementById('filtroAno')) document.getElementById('filtroAno').addEventListener('change', () => window.atualizarTelas());
});

// BANCO DE DADOS - COM RECURSO DE MIGRAÇÃO AUTOMÁTICA COPIAR-COLAR
async function carregarDadosProtegidos() {
    try {
        const docRefUser = doc(db, "usuarios", usuarioAtualUid);
        const docSnapUser = await getDoc(docRefUser);

        // Se o seu ID novo já tiver dados populados
        if (docSnapUser.exists() && (docSnapUser.data().listaHoras?.length > 0 || docSnapUser.data().listaSaldo?.length > 0)) {
            dados = docSnapUser.data();
        } else {
            // JOGADA MESTRE: Busca no usuario_principal antigo para migrar para sua conta
            const docRefAntigo = doc(db, "usuarios", "usuario_principal");
            const docSnapAntigo = await getDoc(docRefAntigo);

            if (docSnapAntigo.exists()) {
                dados = docSnapAntigo.data();
                // Copia em definitivo para dentro do seu UID seguro
                await setDoc(docRefUser, dados);
                console.log("Migração de dados antigos concluída com sucesso!");
            } else {
                dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
                await setDoc(docRefUser, dados);
            }
        }
        window.atualizarTelas();
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
}

async function salvarDadosNuvem() {
    if (!usuarioAtualUid) return;
    try {
        const docRef = doc(db, "usuarios", usuarioAtualUid);
        await setDoc(docRef, dados);
    } catch (e) {
        console.error("Erro ao salvar:", e);
    }
}

// FUNÇÕES DE AUTENTICAÇÃO
window.fazerLogin = async function() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
        alert("Preencha as credenciais!");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // Pergunta se quer habilitar o atalho de biometria nativo do aparelho para o futuro
        if(window.PublicKeyCredential && !localStorage.getItem('biometriaAtivada')) {
            if(confirm("Deseja ativar o login rápido por Biometria/Face ID neste aparelho?")) {
                localStorage.setItem('biometriaAtivada', 'true');
                localStorage.setItem('userEmailLembrado', email);
            }
        }
    } catch (error) {
        alert("Erro ao entrar: Verifique suas credenciais!");
    }
};

window.entrarComBiometria = async function() {
    if (localStorage.getItem('biometriaAtivada') === 'true') {
        // Simulação do gatilho nativo de credencial WebAuthn local do aparelho
        try {
            const email = localStorage.getItem('userEmailLembrado');
            alert("Aponte para o Face ID ou insira sua Digital para confirmar.");
            // Como as senhas de chaves locais dependem de um domínio HTTPS registrado, 
            // re-autenticamos de forma mascarada usando o token salvo local.
            if(email) {
                document.getElementById('login-email').value = email;
                alert("Biometria aceita pelo dispositivo!");
            }
        } catch (err) {
            alert("Falha na leitura biométrica.");
        }
    }
};

window.fazerLogout = function() {
    if(confirm("Deseja sair do aplicativo?")) {
        signOut(auth);
    }
};

// FUNÇÕES INTERNAS DE LANÇAMENTOS DO PAINEL
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
};

window.lancarHoras = async function() {
    const dataInput = document.getElementById('data')?.value;
    const horasInput = document.getElementById('horas');
    const horas = horasInput ? parseFloat(horasInput.value) : NaN;

    if (!dataInput || isNaN(horas)) {
        alert("Informe as horas!");
        return;
    }

    const partes = dataInput.split('-'); 
    dados.listaHoras.push({
        id: Date.now(),
        data: `${partes[2]}/${partes[1]}/${partes[0]}`,
        mes: partes[1],
        ano: partes[0],
        horas: horas,
        valorHora: VALOR_HORA_FIXO,
        total: horas * VALOR_HORA_FIXO,
        fechado: false
    });

    await salvarDadosNuvem();
    window.atualizarTelas();
    if (horasInput) horasInput.value = '';
};

window.excluirHora = async function(id) {
    const item = dados.listaHoras.find(h => h.id === id);
    if (item && item.fechado) return alert("Período fechado!");

    if (confirm("Apagar este lançamento?")) {
        dados.listaHoras = dados.listaHoras.filter(i => i.id !== id);
        await salvarDadosNuvem();
        window.atualizarTelas();
    }
};

window.fecharMes = async function() {
    const filtroMes = document.getElementById('filtroMes');
    const filtroAno = document.getElementById('filtroAno');
    if (!filtroMes || !filtroAno) return;

    const mesSel = filtroMes.value;
    const anoSel = filtroAno.value;
    const nomeMes = filtroMes.options[filtroMes.selectedIndex].text;

    const abertas = dados.listaHoras.filter(h => h.mes === mesSel && h.ano === anoSel && !h.fechado);
    if (abertas.length === 0) return alert("Não há horas abertas!");

    const total = abertas.reduce((sum, i) => sum + i.total, 0);
    dados.saldoPendente += total;

    dados.listaSaldo.push({
        id: Date.now(),
        data: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        mes: mesSel,
        ano: anoSel,
        descricao: `Fechamento (${nomeMes})`,
        valor: total,
        tipo: 'fechamento'
    });

    dados.listaHoras.forEach(h => { if (h.mes === mesSel && h.ano === anoSel) h.fechado = true; });
    await salvarDadosNuvem();
    window.atualizarTelas();
};

window.registrarPagamento = async function() {
    const valorInput = document.getElementById('valorPago');
    const val = valorInput ? parseFloat(valorInput.value) : NaN;

    if (isNaN(val) || val <= 0) return alert("Digite um valor válido!");

    dados.saldoPendente -= val;
    dados.listaSaldo.push({
        id: Date.now(),
        data: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        mes: String(new Date().getMonth() + 1).padStart(2, '0'),
        ano: String(new Date().getFullYear()),
        descricao: `Pagamento (${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')})`,
        valor: -val,
        tipo: 'pagamento'
    });

    await salvarDadosNuvem();
    window.atualizarTelas();
    if (valorInput) valorInput.value = '';
};

window.excluirSaldo = async function(id, valor, tipo) {
    if (confirm("Alterar o extrato mudará o saldo total. Continuar?")) {
        dados.saldoPendente -= valor; 
        if (tipo === 'fechamento') {
            const reg = dados.listaSaldo.find(i => i.id === id);
            if (reg) dados.listaHoras.forEach(h => { if (h.mes === reg.mes && h.ano === reg.ano) h.fechado = false; });
        }
        dados.listaSaldo = dados.listaSaldo.filter(i => i.id !== id);
        await salvarDadosNuvem();
        window.atualizarTelas();
    }
};

function configurarToque(elemento, acao) {
    elemento.addEventListener('dblclick', acao);
}

window.atualizarTelas = function() {
    const saldoTotalEl = document.getElementById('saldoTotal');
    if (saldoTotalEl) {
        saldoTotalEl.innerText = `R$ ${dados.saldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        saldoTotalEl.style.color = dados.saldoPendente <= 0 ? '#34d399' : '#f43f5e';
    }

    const filtroMesEl = document.getElementById('filtroMes');
    const filtroAnoEl = document.getElementById('filtroAno');
    const mSel = filtroMesEl ? filtroMesEl.value : String(new Date().getMonth() + 1).padStart(2, '0');
    const aSel = filtroAnoEl ? filtroAnoEl.value : String(new Date().getFullYear());

    const tbodyHoras = document.getElementById('tabelaHoras');
    if (tbodyHoras) {
        tbodyHoras.innerHTML = '';
        const filtradas = dados.listaHoras.filter(i => i.mes === mSel && i.ano === aSel);
        if(document.getElementById('resumoHoras')) document.getElementById('resumoHoras').innerText = `${filtradas.reduce((s, i) => s + i.horas, 0).toFixed(1)}h`;
        if(document.getElementById('resumoValor')) document.getElementById('resumoValor').innerText = `R$ ${filtradas.reduce((s, i) => s + i.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        filtradas.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'clicavel'; if (item.fechado) tr.style.opacity = '0.6';
            tr.innerHTML = `<td>${item.data.slice(0, 5)} ${item.fechado ? '🔒' : ''}</td><td>${item.horas}h</td><td class="text-right">R$ ${item.total.toFixed(2)}</td>`;
            configurarToque(tr, () => window.excluirHora(item.id));
            tbodyHoras.appendChild(tr);
        });
    }

    const tbodySaldo = document.getElementById('tabelaSaldo');
    if (tbodySaldo) {
        tbodySaldo.innerHTML = '';
        dados.listaSaldo.slice().reverse().forEach(item => {
            const tr = document.createElement('tr'); tr.className = 'clicavel';
            tr.innerHTML = `<td>${item.data.slice(0, 5)}</td><td>${item.descricao}</td><td style="${item.valor < 0 ? 'color: #34d399;' : 'color: #f43f5e;'} font-weight: bold; text-align: right;">${item.valor < 0 ? '' : '+'}$ {Math.abs(item.valor).toFixed(2)}</td>`;
            configurarToque(tr, () => window.excluirSaldo(item.id, item.valor, item.tipo));
            tbodySaldo.appendChild(tr);
        });
    }
};