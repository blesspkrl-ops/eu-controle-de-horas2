import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do seu novo projeto Firebase (Atualizado conforme seu print)
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
const auth = getAuth(app);
const db = getFirestore(app);

// Estado Local dos Dados
let dados = {
    saldoPendente: 0,
    listaHoras: [],
    listaSaldo: []
};

let usuarioAtual = null;
const VALOR_HORA_FIXO = 7.50;

// Elementos da Interface
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');

// Inicializa datas e filtros padrões
const hoje = new Date();
document.getElementById('data').valueAsDate = hoje;
document.getElementById('filtroMes').value = String(hoje.getMonth() + 1).padStart(2, '0');
document.getElementById('filtroAno').value = String(hoje.getFullYear());

// ==========================================
// CONTROLE DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ==========================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        //loginScreen.style.display = 'none';
        //appScreen.style.display = 'block';
        await carregarDadosNuvem();
    } else {
        usuarioAtual = null;
        //loginScreen.style.display = 'flex';
        //appScreen.style.display = 'none';
    }
});

//document.getElementById('btn-entrar').addEventListener('click', async () => {
     //const email = document.getElementById('login-email').value;
    //const senha = document.getElementById('login-senha').value;

    //if (!email || !senha) {
        //alert("Preencha todos os campos!");
        //return;
    //}

   //try {
        //await signInWithEmailAndPassword(auth, email, senha);
    //} catch (error) {
        //alert("Erro ao fazer login: Verifique suas credenciais.");
    //}
//});

//document.getElementById('btn-sair').addEventListener('click', () => {
    //signOut(auth);
//});


// ==========================================
// BANCO DE DADOS (FIRESTORE)
// ==========================================
async function carregarDadosNuvem() {
    if (!usuarioAtual) return;
    try {
        const docRef = doc(db, "usuarios", usuarioAtual.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            dados = docSnap.data();
            if (!dados.listaHoras) dados.listaHoras = [];
            if (!dados.listaSaldo) dados.listaSaldo = [];
        } else {
            dados = { saldoPendente: 0, listaHoras: [], listaSaldo: [] };
            await setDoc(docRef, dados);
        }
        atualizarTelas();
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
}

async function salvarDadosNuvem() {
    if (!usuarioAtual) return;
    try {
        const docRef = doc(db, "usuarios", usuarioAtual.uid);
        await setDoc(docRef, dados);
    } catch (e) {
        alert("Erro ao salvar dados na nuvem! Verifique sua conexão.");
    }
}


// ==========================================
// REGRAS DE NEGÓCIO E LÓGICA DO APP
// ==========================================

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

// LANÇAR HORAS
document.getElementById('btn-lancar-horas').addEventListener('click', async () => {
    const dataInput = document.getElementById('data').value;
    const horas = parseFloat(document.getElementById('horas').value);

    if (!dataInput || isNaN(horas)) {
        alert("Por favor, informe a quantidade de horas!");
        return;
    }

    const partesData = dataInput.split('-'); 

    const novoLancamento = {
        id: Date.now(),
        data: `${partesData[2]}/${partesData[1]}/${partesData[0]}`,
        mes: partesData[1],
        ano: partesData[0],
        horas: horas,
        valorHora: VALOR_HORA_FIXO,
        total: horas * VALOR_HORA_FIXO,
        fechado: false
    };

    dados.listaHoras.push(novoLancamento);
    await salvarDadosNuvem();
    atualizarTelas();
    
    document.getElementById('horas').value = '';
});

async function excluirHora(id) {
    const item = dados.listaHoras.find(h => h.id === id);
    if (item && item.fechado) {
        alert("Este dia faz parte de um mês que já foi fechado e enviado para a conta da empresa.");
        return;
    }

    if (confirm("Tem certeza que deseja apagar este lançamento de horas?")) {
        dados.listaHoras = dados.listaHoras.filter(item => item.id !== id);
        await salvarDadosNuvem();
        atualizarTelas();
    }
}

// FECHAR MÊS
document.getElementById('btn-fechar-mes').addEventListener('click', async () => {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;
    const nomeMes = document.getElementById('filtroMes').options[document.getElementById('filtroMes').selectedIndex].text;

    const horasAbertasDoMes = dados.listaHoras.filter(h => h.mes === mesSelecionado && h.ano === anoSelecionado && !h.fechado);

    if (horasAbertasDoMes.length === 0) {
        alert(`Não há novas horas em aberto para fechar em ${nomeMes}/${anoSelecionado}!`);
        return;
    }

    const totalTrabalhado = horasAbertasDoMes.reduce((sum, item) => sum + item.total, 0);
    dados.saldoPendente += totalTrabalhado;

    const dataHoje = new Date();
    const diaReg = String(dataHoje.getDate()).padStart(2, '0');
    const mesReg = String(dataHoje.getMonth() + 1).padStart(2, '0');

    dados.listaSaldo.push({
        id: Date.now(),
        data: `${diaReg}/${mesReg}`,
        mes: mesSelecionado,
        ano: anoSelecionado,
        descricao: `Fechamento (${nomeMes})`,
        valor: totalTrabalhado,
        tipo: 'fechamento'
    });

    dados.listaHoras.forEach(h => {
        if (h.mes === mesSelecionado && h.ano === anoSelecionado) {
            h.fechado = true;
        }
    });

    await salvarDadosNuvem();
    atualizarTelas();
    alert(`Período de ${nomeMes} fechado com sucesso! R$ ${totalTrabalhado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} enviado ao saldo.`);
});

// REGISTRAR PAGAMENTO
document.getElementById('btn-confirmar-pagamento').addEventListener('click', async () => {
    const valorPago = parseFloat(document.getElementById('valorPago').value);

    if (isNaN(valorPago) || valorPago <= 0) {
        alert("Digite um valor válido!");
        return;
    }

    const dataHoje = new Date();
    const diaReg = String(dataHoje.getDate()).padStart(2, '0');
    const mesReg = String(dataHoje.getMonth() + 1).padStart(2, '0');

    dados.saldoPendente -= valorPago;

    dados.listaSaldo.push({
        id: Date.now(),
        data: `${diaReg}/${mesReg}`,
        mes: mesReg,
        ano: String(dataHoje.getFullYear()),
        descricao: `Pagamento (${diaReg}/${mesReg})`,
        valor: -valorPago,
        tipo: 'pagamento'
    });

    await salvarDadosNuvem();
    atualizarTelas();
    document.getElementById('valorPago').value = '';
});

async function excluirSaldo(id, valor, tipo) {
    if (confirm("Atenção: Excluir este registro vai alterar o saldo total. Deseja continuar?")) {
        dados.saldoPendente -= valor; 

        if (tipo === 'fechamento') {
            const registro = dados.listaSaldo.find(item => item.id === id);
            if (registro) {
                dados.listaHoras.forEach(h => {
                    if (h.mes === registro.mes && h.ano === registro.ano) {
                        h.fechado = false;
                    }
                });
            }
        }

        dados.listaSaldo = dados.listaSaldo.filter(item => item.id !== id);
        await salvarDadosNuvem();
        atualizarTelas();
    }
}

function configurarToque(elemento, acaoDeletar) {
    let timerToque;
    elemento.addEventListener('touchstart', () => {
        timerToque = setTimeout(acaoDeletar, 800);
    }, { passive: true });
    elemento.addEventListener('touchend', () => clearTimeout(timerToque));
    elemento.addEventListener('dblclick', acaoDeletar);
}

// ATUALIZAR INTERFACE
window.atualizarTelas = function() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;

    document.getElementById('saldoTotal').innerText = `R$ ${dados.saldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (dados.saldoPendente <= 0) {
        document.getElementById('saldoTotal').style.color = '#34d399'; 
    } else {
        document.getElementById('saldoTotal').style.color = '#f43f5e'; 
    }

    // TABELA 1: HORAS
    const tbodyHoras = document.getElementById('tabelaHoras');
    tbodyHoras.innerHTML = '';
    
    const horasFiltradas = dados.listaHoras.filter(item => item.mes === mesSelecionado && item.ano === anoSelecionado);
    const totalHorasNum = horasFiltradas.reduce((sum, item) => sum + item.horas, 0);
    const totalValorMes = horasFiltradas.reduce((sum, item) => sum + item.total, 0);
    
    document.getElementById('resumoHoras').innerText = `${totalHorasNum.toFixed(1)}h`;
    document.getElementById('resumoValor').innerText = `R$ ${totalValorMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    horasFiltradas.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        if (item.fechado) tr.style.opacity = '0.6';
        
        const dataHorasFormatada = item.data.slice(0, 5);

        tr.innerHTML = `
            <td>${dataHorasFormatada} ${item.fechado ? '🔒' : ''}</td>
            <td>${item.horas}h</td>
            <td>R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        configurarToque(tr, () => excluirHora(item.id));
        tbodyHoras.appendChild(tr);
    });

    // TABELA 2: EXTRATO (GLOBAL)
    const tbodySaldo = document.getElementById('tabelaSaldo');
    tbodySaldo.innerHTML = '';
    
    dados.listaSaldo.slice().reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        
        const corValor = item.valor < 0 ? 'color: #f43f5e;' : 'color: #34d399;';
        const sinal = item.valor < 0 ? '' : '+';
        const dataFormatada = item.data.slice(0, 5);
        
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${item.descricao}</td>
            <td style="${corValor} font-weight: bold; text-align: right;">${sinal} R$ ${Math.abs(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        configurarToque(tr, () => excluirSaldo(item.id, item.valor, item.tipo));
        tbodySaldo.appendChild(tr);
    });
};