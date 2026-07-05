import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTcBDpnjpg9tYDNvpkoXyjskyxaO00-d0",
    authDomain: "controle-de-horas-83afb.firebaseapp.com",
    projectId: "controle-de-horas-83afb",
    storageBucket: "controle-de-horas-83afb.firebasestorage.app",
    messagingSenderId: "970403178442",
    appId: "1:970403178442:web:ca235e1909a8a8deee1133"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
let usuarioAtualUid = null;
const VALOR_HORA_FIXO = 7.50;

function configurarDataAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    if (document.getElementById('data')) {
        document.getElementById('data').value = `${ano}-${mes}-${dia}`;
    }
    if (document.getElementById('filtroMes')) {
        document.getElementById('filtroMes').value = mes;
    }
    if (document.getElementById('filtroAno')) {
        document.getElementById('filtroAno').value = String(ano);
    }
}

// Configura a persistência da sessão antes de verificar o estado do usuário
setPersistence(auth, browserSessionPersistence)
    .then(() => {
        onAuthStateChanged(auth, async (user) => {
            const loginScreen = document.getElementById('login-screen');
            const appScreen = document.getElementById('app-screen');
            if (user) {
                usuarioAtualUid = user.uid;
                if (loginScreen) loginScreen.classList.add('hidden');
                if (appScreen) appScreen.classList.remove('hidden');
                configurarDataAtual();
                await carregarDados();
            } else {
                if (loginScreen) loginScreen.classList.remove('hidden');
                if (appScreen) appScreen.classList.add('hidden');
            }
        });
    })
    .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
    });

async function carregarDados() {
    const docRef = doc(db, "usuarios", usuarioAtualUid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        dados = snap.data();
        if (!dados.listaSaldo) dados.listaSaldo = [];
        if (!dados.listaHoras) dados.listaHoras = [];
    } else {
        const snapAntigo = await getDoc(doc(db, "usuarios", "usuario_principal"));
        dados = snapAntigo.exists() ? snapAntigo.data() : { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
        if (!dados.listaSaldo) dados.listaSaldo = [];
        await salvarDados();
    }
    window.atualizarTelas();
}

async function salvarDados() {
    if (!usuarioAtualUid) return;
    await setDoc(doc(db, "usuarios", usuarioAtualUid), dados);
}

// Função de apoio para ordenar as datas corretamente
function obterObjetoData(stringData) {
    if (!stringData) return new Date(0);
    const partes = stringData.split('/');
    // Se a string já estiver cortada como DD/MM, assume o ano atual para ordenação interna
    const ano = partes[2] || new Date().getFullYear();
    return new Date(ano, partes[1] - 1, partes[0]);
}

// EXPOSIÇÃO DAS FUNÇÕES PARA O HTML
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const abaDestino = document.getElementById(tabId);
    if (abaDestino) {
        abaDestino.classList.add('active');
    }
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
};

window.fazerLogin = async () => {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) { 
        alert("Erro de login!"); 
    }
};

window.fazerLogout = () => signOut(auth);

window.lancarHoras = async () => {
    const dataCampo = document.getElementById('data').value;
    const h = parseFloat(document.getElementById('horas').value);
    if (!dataCampo || isNaN(h)) return alert("Preencha os campos!");

    const d = dataCampo.split('-');
    dados.listaHoras.push({
        id: Date.now(),
        data: `${d[2]}/${d[1]}/${d[0]}`,
        mes: d[1],
        ano: d[0],
        horas: h,
        total: h * VALOR_HORA_FIXO,
        fechado: false
    });

    await salvarDados();
    window.atualizarTelas();
    document.getElementById('horas').value = '';
};

window.fecharMes = async () => {
    const m = document.getElementById('filtroMes').value;
    const a = document.getElementById('filtroAno').value;
    
    const pendentes = dados.listaHoras.filter(i => i.mes === m && i.ano === a && !i.fechado);
    if (pendentes.length === 0) return alert("Nenhuma hora aberta para fechar neste mês!");

    const valorFechamento = pendentes.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    
    pendentes.forEach(i => i.fechado = true);
    dados.saldoPendente = parseFloat(dados.saldoPendente || 0) + valorFechamento;

    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

    dados.listaSaldo.push({
        id: Date.now(),
        data: dataFormatada,
        descricao: `Fechamento ${m}/${a}`,
        valor: valorFechamento,
        tipo: 'credito',
        refMes: m,
        refAno: a
    });

    await salvarDados();
    window.atualizarTelas();
    alert("Mês fechado com sucesso e acumulado no saldo!");
};

window.registrarPagamento = async () => {
    const valor = parseFloat(document.getElementById('valorPago').value);
    if (isNaN(valor) || valor <= 0) return alert("Insira um valor válido recebido!");

    dados.saldoPendente = parseFloat(dados.saldoPendente || 0) - valor;

    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

    dados.listaSaldo.push({
        id: Date.now(),
        data: dataFormatada,
        descricao: "Pagamento Recebido",
        valor: valor * -1,
        tipo: 'debito'
    });

    await salvarDados();
    window.atualizarTelas();
    document.getElementById('valorPago').value = '';
    alert("Pagamento registrado!");
};

window.excluirExtrato = async (id) => {
    if (!confirm("Deseja realmente apagar este lançamento do extrato?")) return;

    const item = dados.listaSaldo.find(x => x.id === id);
    if (!item) return;

    if (item.tipo === 'credito') {
        dados.saldoPendente = parseFloat(dados.saldoPendente || 0) - item.valor;
        dados.listaHoras.forEach(h => {
            if (h.mes === item.refMes && h.ano === item.refAno) {
                h.fechado = false;
            }
        });
    } else if (item.tipo === 'debito') {
        dados.saldoPendente = parseFloat(dados.saldoPendente || 0) + Math.abs(item.valor);
    }

    dados.listaSaldo = dados.listaSaldo.filter(x => x.id !== id);
    await salvarDados();
    window.atualizarTelas();
};

window.atualizarTelas = () => {
    if (!document.getElementById('saldoTotal')) return; 

    document.getElementById('saldoTotal').innerText = `R$ ${parseFloat(dados.saldoPendente || 0).toFixed(2)}`;
    
    const m = document.getElementById('filtroMes').value;
    const a = document.getElementById('filtroAno').value;
    
    // 1. HORAS: Filtra e ordena de forma CRESCENTE (Do dia 01 em diante)
    const filtradasHoras = dados.listaHoras.filter(i => i.mes === m && i.ano === a);
    filtradasHoras.sort((x, y) => obterObjetoData(x.data) - obterObjetoData(y.data));

    const totalH = filtradasHoras.reduce((s, i) => s + parseFloat(i.horas || 0), 0);
    const totalV = filtradasHoras.reduce((s, i) => s + parseFloat(i.total || 0), 0);

    document.getElementById('resumoHoras').innerText = `${totalH.toFixed(1)}h`;
    document.getElementById('resumoValor').innerText = `R$ ${totalV.toFixed(2)}`;

    // Renderiza Histórico de Horas (Apenas DD/MM no layout)
    const tbodyHoras = document.getElementById('tabelaHoras');
    if (tbodyHoras) {
        tbodyHoras.innerHTML = '';
        filtradasHoras.forEach(i => {
            const tr = document.createElement('tr');
            tr.className = 'clicavel';
            const exibicaoData = i.data.substring(0, 5); // Recorta para exibir apenas "DD/MM"
            tr.innerHTML = `<td>${exibicaoData} ${i.fechado ? '🔒' : ''}</td><td>${i.horas}h</td><td>R$ ${parseFloat(i.total).toFixed(2)}</td>`;
            tr.ondblclick = async () => {
                if(i.fechado) return alert("Período já fechado! Exclua o fechamento no extrato primeiro.");
                dados.listaHoras = dados.listaHoras.filter(x => x.id !== i.id);
                await salvarDados();
                window.atualizarTelas();
            };
            tbodyHoras.appendChild(tr);
        });
    }

    // 2. EXTRATO SALDO: Ordena de forma DECRESCENTE (Mais recente no TOPO)
    const tbodySaldo = document.getElementById('tabelaSaldo');
    if (tbodySaldo) {
        tbodySaldo.innerHTML = '';
        
        const extratoOrdenado = [...dados.listaSaldo];
        extratoOrdenado.sort((x, y) => obterObjetoData(y.data) - obterObjetoData(x.data)); // DECRESCENTE

        extratoOrdenado.forEach(i => {
            const tr = document.createElement('tr');
            tr.className = 'clicavel';
            const corValor = i.valor >= 0 ? "color: #34d399;" : "color: #f43f5e;";
            const exibicaoData = i.data.substring(0, 5); // Recorta para exibir apenas "DD/MM"
            tr.innerHTML = `<td>${exibicaoData}</td><td>${i.descricao}</td><td style="${corValor}">R$ ${Math.abs(i.valor).toFixed(2)}</td>`;
            tr.ondblclick = () => window.excluirExtrato(i.id);
            tbodySaldo.appendChild(tr);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('btn-entrar')) {
        document.getElementById('btn-entrar').addEventListener('click', window.fazerLogin);
    }
    if (document.getElementById('btn-sair')) {
        document.getElementById('btn-sair').addEventListener('click', window.fazerLogout);
    }
    if (document.getElementById('filtroMes')) {
        document.getElementById('filtroMes').addEventListener('change', window.atualizarTelas);
    }
    if (document.getElementById('filtroAno')) {
        document.getElementById('filtroAno').addEventListener('change', window.atualizarTelas);
    }
});