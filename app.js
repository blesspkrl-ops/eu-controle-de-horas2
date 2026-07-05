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
        total: horas * VALOR_HORA_FIXO,
        fechado: false
    };

    dados.listaHoras.push(novoLancamento);
    salvarDados();
    atualizarTelas();
    
    document.getElementById('horas').value = '';
}

function excluirHora(id) {
    const item = dados.listaHoras.find(h => h.id === id);
    if (item && item.fechado) {
        alert("Este dia faz parte de um mês que já foi fechado e enviado para a conta da empresa. Se quiser apagar, remova o registro correspondente no Extrato Geral da aba Salário para o saldo bater certinho!");
        return;
    }

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

    const horasAbertasDoMes = dados.listaHoras.filter(h => h.mes === mesSelecionado && h.ano === anoSelecionado && !h.fechado);

    if (horasAbertasDoMes.length === 0) {
        alert(`Não há novas horas em aberto para fechar em ${nomeMes}/${anoSelecionado}!`);
        return;
    }

    const totalTrabalhado = horasAbertasDoMes.reduce((sum, item) => sum + item.total, 0);
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

    dados.listaHoras.forEach(h => {
        if (h.mes === mesSelecionado && h.ano === anoSelecionado) {
            h.fechado = true;
        }
    });

    salvarDados();
    atualizarTelas();
    alert(`Período de ${nomeMes} fechado com sucesso! R$ ${totalTrabalhado.toFixed(2)} enviados para o Saldo.`);
}

// REGISTRAR PAGAMENTO
function registrarPagamento() {
    const valorPago = parseFloat(document.getElementById('valorPago').value);

    if (isNaN(valorPago) || valorPago <= 0) {
        alert("Digite um valor válido!");
        return;
    }

    const dataHoje = new Date();
    const diaReg = String(dataHoje.getDate()).padStart(2, '0');
    const mesReg = String(dataHoje.getMonth() + 1).padStart(2, '0');

    dados.saldoPendente -= valorPago;

    // ALTERADO: Descrição salva como "Pagamento (DD/MM)" conforme pedido
    dados.listaSaldo.push({
        id: Date.now(),
        data: dataHoje.toLocaleDateString('pt-BR'),
        mes: mesReg,
        ano: String(dataHoje.getFullYear()),
        descricao: `Pagamento (${diaReg}/${mesReg})`,
        valor: -valorPago,
        tipo: 'pagamento'
    });

    salvarDados();
    atualizarTelas();
    document.getElementById('valorPago').value = '';
}

function excluirSaldo(id, valor, tipo) {
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
        salvarDados();
        atualizarTelas();
    }
}

// DETECTOR DE TOQUE LONGO / DOIS CLIQUES
function configurarToque(elemento, acaoDeletar) {
    let timerToque;
    
    elemento.addEventListener('touchstart', () => {
        timerToque = setTimeout(acaoDeletar, 800);
    }, { passive: true });

    elemento.addEventListener('touchend', () => {
        clearTimeout(timerToque);
    });

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
    
    const totalHorasMes = horasFiltradas.reduce((sum, item) => sum + item.horas, 0);
    const totalValorMes = horasFiltradas.reduce((sum, item) => sum + item.total, 0);
    
    document.getElementById('resumoHoras').innerText = `${totalHorasMes.toFixed(1)}h`;
    document.getElementById('resumoValor').innerText = `R$ ${totalValorMes.toFixed(2)}`;

    horasFiltradas.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'clicavel';
        if (item.fechado) {
            tr.style.opacity = '0.6';
        }
        // ALTERADO: LINHA AGORA SÓ ADICIONA DATA, HORAS E TOTAL (REMOVIDO VALOR_HORA)
        tr.innerHTML = `
            <td>${item.data} ${item.fechado ? '🔒' : ''}</td>
            <td>${item.horas}h</td>
            <td>R$ ${item.total.toFixed(2)}</td>
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