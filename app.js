import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do seu novo projeto Firebase (Validado)
const firebaseConfig = {
    apiKey: "AIzaSyCtCBDpnjpg9tYDNvpkoXyjskyxaO00-d0",
    authDomain: "controle-de-horas-83afb.firebaseapp.com",
    projectId: "controle-de-horas-83afb",
    storageBucket: "controle-de-horas-83afb.firebasestorage.app",
    messagingSenderId: "970403178442",
    appId: "1:970403178442:web:ca23be1909a8a8deee1133"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado Local dos Dados
let dados = {
    saldoPendente: 0,
    listaHoras: [],
    listaSaldo: []
};

// ID Fixo para usar direto sem precisar de tela de login
const USUARIO_ID = "usuario_principal";
const VALOR_HORA_FIXO = 7.50;

// Inicializa datas e filtros padrões ao carregar a página
const hoje = new Date();
if(document.getElementById('data')) document.getElementById('data').valueAsDate = hoje;
if(document.getElementById('filtroMes')) document.getElementById('filtroMes').value = String(hoje.getMonth() + 1).padStart(2, '0');
if(document.getElementById('filtroAno')) document.getElementById('filtroAno').value = String(hoje.getFullYear());

// Carrega os dados direto da nuvem assim que o script inicia
carregarDadosNuvem();

// ==========================================
// BANCO DE DADOS (FIRESTORE)
// ==========================================
async function carregarDadosNuvem() {
    try {
        const docRef = doc(db, "usuarios", USUARIO_ID);
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
    try {
        const docRef = doc(db, "usuarios", USUARIO_ID);
        await setDoc(docRef, dados);
    } catch (e) {
        console.error("Erro ao salvar dados na nuvem:", e);
        alert("Erro ao salvar dados na nuvem! Verifique sua conexão.");
    }
}

// ==========================================
// FUNÇÕES GLOBAIS (Expostas para o HTML)
// ==========================================

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

// LANÇAR HORAS
window.lancarHoras = async function() {
    const dataInput = document.getElementById('data').value;
    const horasInput = document.getElementById('horas');
    const horas = parseFloat(horasInput.value);

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
    
    horasInput.value = '';
};

// EXCLUIR HORA
window.excluirHora = async function(id) {
    const item = dados.listaHoras.find(h => h.id === id);
    if (item && item.fechado) {
        alert("Este dia faz parte de um período fechado.");
        return;
    }

    if (confirm("Deseja apagar este lançamento?")) {
        dados.listaHoras = dados.listaHoras.filter(item => item.id !== id);
        await salvarDadosNuvem();
        atualizarTelas();
    }
};

// FECHAR MÊS
window.fecharMes = async function() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;
    const selectMes = document.getElementById('filtroMes');
    const nomeMes = selectMes.options[selectMes.selectedIndex].text;

    const horasAbertasDoMes = dados.listaHoras.filter(h => h.mes === mesSelecionado && h.ano === anoSelecionado && !h.fechado);

    if (horasAbertasDoMes.length === 0) {
        alert(`Não há horas em aberto para fechar em ${nomeMes}/${anoSelecionado}!`);
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
    alert(`Período fechado: R$ ${totalTrabalhado.toFixed(2)} enviado ao saldo.`);
};

// REGISTRAR PAGAMENTO
window.registrarPagamento = async function() {
    const valorInput = document.getElementById('valorPago');
    const valorPago = parseFloat(valorInput.value);

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
    valorInput.value = '';
};

window.excluirSaldo = async function(id, valor, tipo) {
    if (confirm("Alterar este registro mudará o saldo total. Continuar?")) {
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
};

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
    const filtroMesEl = document.getElementById('filtroMes');
    const filtroAnoEl = document.getElementById('filtroAno');
    if (!filtroMesEl || !filtroAnoEl) return;

    const mesSelecionado = filtroMesEl.value;
    const anoSelecionado = filtroAnoEl.value;

    const saldoTotalEl = document.getElementById('saldoTotal');
    if (saldoTotalEl) {
        saldoTotalEl.innerText = `R$ ${dados.saldoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        saldoTotalEl.style.color = dados.saldoPendente <= 0 ? '#34d399' : '#f43f5e';
    }

    // TABELA 1: HORAS
    const tbodyHoras = document.getElementById('tabelaHoras');
    if (tbodyHoras) {
        tbodyHoras.innerHTML = '';
        const horasFiltradas = dados.listaHoras.filter(item => item.mes === mesSelecionado && item.ano === anoSelecionado);
        const totalHorasNum = horasFiltradas.reduce((sum, item) => sum + item.horas, 0);
        const totalValorMes = horasFiltradas.reduce((sum, item) => sum + item.total, 0);
        
        if(document.getElementById('resumoHoras')) document.getElementById('resumoHoras').innerText = `${totalHorasNum.toFixed(1)}h`;
        if(document.getElementById('resumoValor')) document.getElementById('resumoValor').innerText = `R$ ${totalValorMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        horasFiltradas.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'clicavel';
            if (item.fechado) tr.style.opacity = '0.6';
            
            tr.innerHTML = `
                <td>${item.data.slice(0, 5)} ${item.fechado ? '🔒' : ''}</td>
                <td>${item.horas}h</td>
                <td>R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            configurarToque(tr, () => window.excluirHora(item.id));
            tbodyHoras.appendChild(tr);
        });
    }

    // TABELA 2: EXTRATO
    const tbodySaldo = document.getElementById('tabelaSaldo');
    if (tbodySaldo) {
        tbodySaldo.innerHTML = '';
        dados.listaSaldo.slice().reverse().forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'clicavel';
            const corValor = item.valor < 0 ? 'color: #f43f5e;' : 'color: #34d399;';
            const sinal = item.valor < 0 ? '' : '+';
            
            tr.innerHTML = `
                <td>${item.data.slice(0, 5)}</td>
                <td>${item.descricao}</td>
                <td style="${corValor} font-weight: bold; text-align: right;">${sinal} R$ ${Math.abs(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            configurarToque(tr, () => window.excluirSaldo(item.id, item.valor, item.tipo));
            tbodySaldo.appendChild(tr);
        });
    }
};

// Vincula os filtros para atualizar a tela ao mudar mês/ano
if(document.getElementById('filtroMes')) document.getElementById('filtroMes').addEventListener('change', () => window.atualizarTelas());
if(document.getElementById('filtroAno')) document.getElementById('filtroAno').addEventListener('change', () => window.atualizarTelas());