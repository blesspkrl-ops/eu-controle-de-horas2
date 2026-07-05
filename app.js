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

// Configura a data de hoje nos inputs ao carregar
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

setPersistence(auth, browserSessionPersistence).then(() => {
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');
        if (user) {
            usuarioAtualUid = user.uid;
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
            configurarDataAtual();
            await carregarDados();
        } else {
            loginScreen.classList.remove('hidden');
            appScreen.classList.add('hidden');
        }
    });
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

// Auxiliar para ordenar listas por data string (DD/MM/AAAA)
function ordenarPorData(lista) {
    return lista.sort((a, b) => {
        const partesA = a.data.split('/');
        const partesB = b.data.split('/');
        const dataA = new Date(partesA[2], partesA[1] - 1, partesA[0]);
        const dataB = new Date(partesB[2], partesB[1] - 1, partesB[0]);
        return dataA - dataB;
    });
}

// EXPOSIÇÃO DAS FUNÇÕES PARA O HTML
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

window.fazerLogin = async () => {
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-senha').value);
    } catch (e) { alert("Erro de login!"); }
};

window.fazerLogout = () => signOut(auth);

window.lancarHoras = async () => {
    const d = document.getElementById('data').value.split('-');
    const h = parseFloat(document.getElementById('horas').value);
    if (!d[0] || isNaN(h)) return alert("Preencha os campos!");

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
        tipo: 'credito'
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

window.atualizarTelas = () => {
    if (!document.getElementById('saldoTotal')) return; 

    document.getElementById('saldoTotal').innerText = `R$ ${parseFloat(dados.saldoPendente || 0).toFixed(2)}`;
    
    const m = document.getElementById('filtroMes').value;
    const a = document.getElementById('filtroAno').value;
    
    // Ordenar histórico de horas cronologicamente
    const horasOrdenadas = ordenarPorData([...dados.listaHoras]);
    const filtradas = horasOrdenadas.filter(i => i.mes === m && i.ano === a);

    const totalH = filtradas.reduce((s, i) => s + parseFloat(i.horas || 0), 0);
    const totalV = filtradas.reduce((s, i) => s + parseFloat(i.total || 0), 0);

    document.getElementById('resumoHoras').innerText = `${totalH.toFixed(1)}h`;
    document.getElementById('resumoValor').innerText = `R$ ${totalV.toFixed(2)}`;

    // Renderiza Histórico de Horas
    const tbodyHoras = document.getElementById('tabelaHoras');
    tbodyHoras.innerHTML = '';
    filtradas.forEach(i => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        tr.innerHTML = `<td>${i.data}</td><td>${i.horas}h</td><td>R$ ${parseFloat(i.total).toFixed(2)}</td>`;
        tr.ondblclick = async () => {
            if(i.fechado) return alert("Período já fechado! Não é possível apagar.");
            dados.listaHoras = dados.listaHoras.filter(x => x.id !== i.id);
            await salvarDados();
            window.atualizarTelas();
        };
        tbodyHoras.appendChild(tr);
    });

    // Renderiza Extrato de Saldo ordenado por data
    const tbodySaldo = document.getElementById('tabelaSaldo');
    if (tbodySaldo) {
        tbodySaldo.innerHTML = '';
        const saldoOrdenado = ordenarPorData([...dados.listaSaldo]);
        saldoOrdenado.forEach(i => {
            const tr = document.createElement('tr');
            const corValor = i.valor >= 0 ? "color: #34d399;" : "color: #f43f5e;";
            tr.innerHTML = `<td>${i.data}</td><td>${i.descricao}</td><td style="${corValor}">R$ ${Math.abs(i.valor).toFixed(2)}</td>`;
            tbodySaldo.appendChild(tr);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-entrar').addEventListener('click', window.fazerLogin);
    document.getElementById('btn-sair').addEventListener('click', window.fazerLogout);
    document.getElementById('filtroMes').addEventListener('change', window.atualizarTelas);
    document.getElementById('filtroAno').addEventListener('change', window.atualizarTelas);
});