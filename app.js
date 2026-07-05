import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚠️ MUDAR: Cole aqui o SEU bloco de configuração real do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCTcBDpnjpg9tYDNvpkoXyjskyxaO00-d0",
    authDomain: "controle-de-horas-83afb.firebaseapp.com",
    projectId: "controle-de-horas-83afb",
    storageBucket: "controle-de-horas-83afb.firebasestorage.app",
    messagingSenderId: "970403178442",
    appId: "1:970403178442:web:ca235e1909a8a8deee1133"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Estado Local
let dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
let usuarioAtualUid = null;
const VALOR_HORA_FIXO = 7.50;

// Configura persistência: ao fechar o navegador/aba, a sessão encerra
setPersistence(auth, browserSessionPersistence)
    .then(() => {
        // Escuta o status do Login
        onAuthStateChanged(auth, async (user) => {
            const loginScreen = document.getElementById('login-screen');
            const appScreen = document.getElementById('app-screen');

            if (user) {
                usuarioAtualUid = user.uid;
                if (loginScreen) loginScreen.classList.add('hidden');
                if (appScreen) appScreen.classList.remove('hidden');
                await carregarDadosProtegidos();
            } else {
                usuarioAtualUid = null;
                if (loginScreen) loginScreen.classList.remove('hidden');
                if (appScreen) appScreen.classList.add('hidden');
            }
        });
    })
    .catch((error) => {
        console.error("Erro ao definir persistência:", error);
    });

// Vincula os eventos de clique
window.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();
    if (document.getElementById('data')) document.getElementById('data').valueAsDate = hoje;
    if (document.getElementById('filtroMes')) document.getElementById('filtroMes').value = String(hoje.getMonth() + 1).padStart(2, '0');
    if (document.getElementById('filtroAno')) document.getElementById('filtroAno').value = String(hoje.getFullYear());

    const btnEntrar = document.getElementById('btn-entrar');
    if (btnEntrar) btnEntrar.addEventListener('click', fazerLogin);

    const btnSair = document.getElementById('btn-sair');
    if (btnSair) btnSair.addEventListener('click', fazerLogout);
});

// Carrega os dados ou migra do antigo caso seja o primeiro acesso do novo usuário
async function carregarDadosProtegidos() {
    try {
        const docRefUser = doc(db, "usuarios", usuarioAtualUid);
        const docSnapUser = await getDoc(docRefUser);

        if (docSnapUser.exists() && (docSnapUser.data().listaHoras?.length > 0 || docSnapUser.data().listaSaldo?.length > 0)) {
            dados = docSnapUser.data();
        } else {
            const docRefAntigo = doc(db, "usuarios", "usuario_principal");
            const docSnapAntigo = await getDoc(docRefAntigo);

            if (docSnapAntigo.exists()) {
                dados = docSnapAntigo.data();
                await setDoc(docRefUser, dados);
                console.log("Dados migrados para conta pessoal com sucesso!");
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
        console.error("Erro ao salvar dados:", e);
    }
}

async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
        alert("Preencha e-mail e senha!");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
        alert("Erro ao entrar: Verifique suas credenciais!");
    }
}

function fazerLogout() {
    if (confirm("Sair do aplicativo?")) {
        signOut(auth);
    }
}

// Funções Globais (chamadas no HTML)
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
};

window.lancarHoras = async function() {
    const dataInput = document.getElementById('data').value;
    const horas = parseFloat(document.getElementById('horas').value);

    if (!dataInput || isNaN(horas)) return alert("Preencha data e horas!");

    const p = dataInput.split('-');
    dados.listaHoras.push({
        id: Date.now(),
        data: `${p[2]}/${p[1]}/${p[0]}`,
        mes: p[1],
        ano: p[0],
        horas: horas,
        valorHora: VALOR_HORA_FIXO,
        total: horas * VALOR_HORA_FIXO,
        fechado: false
    });

    await salvarDadosNuvem();
    window.atualizarTelas();
    document.getElementById('horas').value = '';
};

window.fecharMes = async function() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;
    const abertas = dados.listaHoras.filter(h => h.mes === mes && h.ano === ano && !h.fechado);
    
    if (abertas.length === 0) return alert("Nada para fechar!");

    const total = abertas.reduce((s, i) => s + i.total, 0);
    dados.saldoPendente += total;
    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR').slice(0, 5),
        descricao: `Fechamento (${mes}/${ano})`,
        valor: total,
        tipo: 'fechamento'
    });

    abertas.forEach(h => h.fechado = true);
    await salvarDadosNuvem();
    window.atualizarTelas();
};

window.registrarPagamento = async function() {
    const val = parseFloat(document.getElementById('valorPago').value);
    if (isNaN(val) || val <= 0) return;

    dados.saldoPendente -= val;
    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR').slice(0, 5),
        descricao: `Pagamento`,
        valor: -val,
        tipo: 'pagamento'
    });

    await salvarDadosNuvem();
    window.atualizarTelas();
    document.getElementById('valorPago').value = '';
};

window.excluirHora = async function(id) {
    const item = dados.listaHoras.find(h => h.id === id);
    if (item?.fechado) return alert("Não pode excluir período fechado!");
    if (confirm("Excluir lançamento?")) {
        dados.listaHoras = dados.listaHoras.filter(i => i.id !== id);
        await salvarDadosNuvem();
        window.atualizarTelas();
    }
};

window.excluirSaldo = async function(id, valor, tipo) {
    if (confirm("Excluir do extrato?")) {
        dados.saldoPendente -= valor;
        if (tipo === 'fechamento') {
            const reg = dados.listaSaldo.find(i => i.id === id);
            dados.listaHoras.forEach(h => { if (h.mes === reg.mes && h.ano === reg.ano) h.fechado = false; });
        }
        dados.listaSaldo = dados.listaSaldo.filter(i => i.id !== id);
        await salvarDadosNuvem();
        window.atualizarTelas();
    }
};

window.atualizarTelas = function() {
    document.getElementById('saldoTotal').innerText = `R$ ${dados.saldoPendente.toFixed(2)}`;
    const m = document.getElementById('filtroMes').value;
    const a = document.getElementById('filtroAno').value;

    const tbodyHoras = document.getElementById('tabelaHoras');
    tbodyHoras.innerHTML = '';
    dados.listaHoras.filter(i => i.mes === m && i.ano === a).forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        tr.innerHTML = `<td>${item.data} ${item.fechado ? '🔒' : ''}</td><td>${item.horas}h</td><td>R$ ${item.total.toFixed(2)}</td>`;
        tr.ondblclick = () => window.excluirHora(item.id);
        tbodyHoras.appendChild(tr);
    });

    const tbodySaldo = document.getElementById('tabelaSaldo');
    tbodySaldo.innerHTML = '';
    dados.listaSaldo.slice().reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.data}</td><td>${item.descricao}</td><td>${item.valor.toFixed(2)}</td>`;
        tr.ondblclick = () => window.excluirSaldo(item.id, item.valor, item.tipo);
        tbodySaldo.appendChild(tr);
    });
};