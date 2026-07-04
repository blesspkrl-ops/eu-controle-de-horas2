let dados = JSON.parse(localStorage.getItem('dados_sistema')) || {
    saldoPendente: 0,
    listaHoras: [],
    listaSaldo: []
};

const VALOR_HORA_FIXO = 7.50;

const hoje = new Date();
document.getElementById('data').valueAsDate = hoje;

const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
const anoAtual = String(hoje.getFullYear());
document.getElementById('filtroMes').value = mesAtual;
document.getElementById('filtroAno').value = anoAtual;

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// LANÇAR HORAS
function lancarHoras() {
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
        total: horas * VALOR_HORA_FIXO
    };

    dados.listaHoras.push(novoLancamento);
    salvarDados();
    atualizarTelas();
    
    document.getElementById('horas').value = '';
}

function excluirHora(id) {
    if (confirm("Tem certeza que deseja apagar este lançamento de horas?")) {
        dados.listaHoras = dados.listaHoras.filter(item => item.id !== id);
        salvarDados();
        atualizarTelas();
    }
}

// FECHAR MÊS
function fecharMes() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;
    const nomeMes = document.getElementById('filtroMes').options[document.getElementById('filtroMes').selectedIndex].text;

    const horasDoMes = dados.listaHoras.filter(h => h.mes === mesSelecionado && h.ano === anoSelecionado);

    if (horasDoMes.length === 0) {
        alert(`Não há horas registradas em ${nomeMes}/${anoSelecionado} para fechar!`);
        return;
    }

    const totalTrabalhado = horasDoMes.reduce((sum, item) => sum + item.total, 0);
    dados.saldoPendente += totalTrabalhado;

    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        mes: mesSelecionado,
        ano: anoSelecionado,
        descricao: `Fechamento (${nomeMes})`,
        valor: totalTrabalhado,
        tipo: 'fechamento'
    });

    dados.listaHoras = dados.listaHoras.filter(h => !(h.mes === mesSelecionado && h.ano === anoSelecionado));

    salvarDados();
    atualizarTelas();
    alert(`Período de ${nomeMes} fechado! R$ ${totalTrabalhado.toFixed(2)} enviados.`);
}

// REGISTRAR PAGAMENTO
function registrarPagamento() {
    const valorPago = parseFloat(document.getElementById('valorPago').value);
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;

    if (isNaN(valorPago) || valorPago <= 0) {
        alert("Digite um valor válido!");
        return;
    }

    dados.saldoPendente -= valorPago;

    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        mes: mesSelecionado,
        ano: anoSelecionado,
        descricao: "Pagamento Recebido",
        valor: -valorPago,
        tipo: 'pagamento'
    });

    salvarDados();
    atualizarTelas();
    document.getElementById('valorPago').value = '';
}

function excluirSaldo(id, valor, tipo) {
    if (confirm("Atenção: Excluir este registro vai alterar o saldo total. Deseja continuar?")) {
        if (tipo === 'fechamento') {
            dados.saldoPendente -= valor; 
        } else if (tipo === 'pagamento') {
            dados.saldoPendente -= valor; 
        }

        dados.listaSaldo = dados.listaSaldo.filter(item => item.id !== id);
        salvarDados();
        atualizarTelas();
    }
}

// FUNÇÃO DETECTORA DE TOQUE LONGO / DOIS CLIQUES PARA O IPHONE
function configurarToque(elemento, acaoDeletar) {
    let timerToque;
    
    // Suporta segurar o dedo (1 segundo)
    elemento.addEventListener('touchstart', () => {
        timerToque = setTimeout(acaoDeletar, 800);
    }, { passive: true });

    elemento.addEventListener('touchend', () => {
        clearTimeout(timerToque);
    });

    // Suporta dois cliques rápidos (Alternativa de segurança)
    elemento.addEventListener('dblclick', acaoDeletar);
}

// ATUALIZAR INTERFACE
function atualizarTelas() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;

    document.getElementById('saldoTotal').innerText = `R$ ${dados.saldoPendente.toFixed(2)}`;
    
    if (dados.saldoPendente <= 0) {
        document.getElementById('saldoTotal').style.color = '#34d399'; 
    } else {
        document.getElementById('saldoTotal').style.color = '#f43f5e'; 
    }

    // TABELA 1: HORAS
    const tbodyHoras = document.getElementById('tabelaHoras');
    tbodyHoras.innerHTML = '';
    
    const horasFiltradas = dados.listaHoras.filter(item => item.mes === mesSelecionado && item.ano === anoSelecionado);
    
    horasFiltradas.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.horas}h</td>
            <td>R$ 7,50</td>
            <td>R$ ${item.total.toFixed(2)}</td>
        `;
        configurarToque(tr, () => excluirHora(item.id));
        tbodyHoras.appendChild(tr);
    });

    // TABELA 2: EXTRATO
    const tbodySaldo = document.getElementById('tabelaSaldo');
    tbodySaldo.innerHTML = '';
    
    const saldoFiltrado = dados.listaSaldo.filter(item => item.mes === mesSelecionado && item.ano === anoSelecionado);
    
    saldoFiltrado.slice().reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        
        const corValor = item.valor < 0 ? 'color: #f43f5e;' : 'color: #34d399;';
        const sinal = item.valor < 0 ? '' : '+';
        
        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.descricao}</td>
            <td style="${corValor} font-weight: bold;">${sinal} R$ ${Math.abs(item.valor).toFixed(2)}</td>
        `;
        configurarToque(tr, () => excluirSaldo(item.id, item.valor, item.tipo));
        tbodySaldo.appendChild(tr);
    });
}

function salvarDados() {
    localStorage.setItem('dados_sistema', JSON.stringify(dados));
}

atualizarTelas();