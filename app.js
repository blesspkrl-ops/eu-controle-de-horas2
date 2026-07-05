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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
let usuarioAtualUid = null;
const VALOR_HORA_FIXO = 7.50;

setPersistence(auth, browserSessionPersistence).then(() => {
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');
        if (user) {
            usuarioAtualUid = user.uid;
            loginScreen.classList.add('hidden');
            appScreen.classList.remove('hidden');
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
    } else {
        // Se for novo, tenta buscar do principal
        const snapAntigo = await getDoc(doc(db, "usuarios", "usuario_principal"));
        dados = snapAntigo.exists() ? snapAntigo.data() : { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
        await salvarDados();
    }
    window.atualizarTelas();
}

async function salvarDados() {
    if (!usuarioAtualUid) return;
    await setDoc(doc(db, "usuarios", usuarioAtualUid), dados);
}

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

window.atualizarTelas = () => {
    // Atualiza Saldo
    document.getElementById('saldoTotal').innerText = `R$ ${parseFloat(dados.saldoPendente || 0).toFixed(2)}`;
    
    // Filtros
    const m = document.getElementById('filtroMes').value;
    const a = document.getElementById('filtroAno').value;
    const filtradas = dados.listaHoras.filter(i => i.mes === m && i.ano === a);

    // Cálculos garantindo que são números
    const totalH = filtradas.reduce((s, i) => s + parseFloat(i.horas || 0), 0);
    const totalV = filtradas.reduce((s, i) => s + parseFloat(i.total || 0), 0);

    // Exibe no HTML
    document.getElementById('resumoHoras').innerText = `${totalH.toFixed(1)}h`;
    document.getElementById('resumoValor').innerText = `R$ ${totalV.toFixed(2)}`;

    // Tabela
    const tbody = document.getElementById('tabelaHoras');
    tbody.innerHTML = '';
    filtradas.forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i.data}</td><td>${i.horas}h</td><td>R$ ${parseFloat(i.total).toFixed(2)}</td>`;
        tr.ondblclick = async () => {
            if(i.fechado) return alert("Período fechado!");
            dados.listaHoras = dados.listaHoras.filter(x => x.id !== i.id);
            await salvarDados();
            window.atualizarTelas();
        };
        tbody.appendChild(tr);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-entrar').addEventListener('click', window.fazerLogin);
    document.getElementById('btn-sair').addEventListener('click', window.fazerLogout);
    document.getElementById('filtroMes').addEventListener('change', window.atualizarTelas);
    document.getElementById('filtroAno').addEventListener('change', window.atualizarTelas);
});