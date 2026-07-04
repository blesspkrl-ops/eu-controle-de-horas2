// Carrega os dados salvos ou cria uma estrutura vazia
let dados = JSON.parse(localStorage.getItem('dados_sistema')) || {
    saldoPendente: 0,
    listaHoras: [],
    listaSaldo: []
};

// Define a data de hoje automaticamente
document.getElementById('data').valueAsDate = new Date();

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
    const valorHora = parseFloat(document.getElementById('valorHora').value);

    if (!dataInput || isNaN(horas) || isNaN(valorHora)) {
        alert("Por favor, preencha todos os campos corretamente!");
        return;
    }

    const novoLancamento = {
        id: Date.now(), // ID único para conseguir deletar depois
        data: dataInput.split('-').reverse().join('/'),
        horas: horas,
        valorHora: valorHora,
        total: horas * valorHora
    };

    dados.listaHoras.push(novoLancamento);
    salvarDados();
    atualizarTelas();
    
    document.getElementById('horas').value = '';
}

// EXCLUIR HORA LANÇADA ERRADA
function excluirHora(id) {
    if (confirm("Tem certeza que deseja apagar este lançamento de horas?")) {
        dados.listaHoras = dados.listaHoras.filter(item => item.id !== id);
        salvarDados();
        atualizarTelas();
    }
}

// FECHAR MÊS
function fecharMes() {
    if (dados.listaHoras.length === 0) {
        alert("Não há horas registradas para fechar o mês!");
        return;
    }

    const totalTrabalhado = dados.listaHoras.reduce((sum, item) => sum + item.total, 0);
    dados.saldoPendente += totalTrabalhado;

    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        descricao: `Fechamento de Período (${dados.listaHoras.length} dias)`,
        valor: totalTrabalhado,
        tipo: 'fechamento'
    });

    dados.listaHoras = []; // Limpa a tabela corrente

    salvarDados();
    atualizarTelas();
    alert(`Período fechado! R$ ${totalTrabalhado.toFixed(2)} enviados para a aba Salário.`);
}

// REGISTRAR PAGAMENTO
function registrarPagamento() {
    const valorPago = parseFloat(document.getElementById('valorPago').value);

    if (isNaN(valorPago) || valorPago <= 0) {
        alert("Digite um valor válido para o pagamento!");
        return;
    }

    dados.saldoPendente -= valorPago;

    dados.listaSaldo.push({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        descricao: "Pagamento Recebido (Empresa pagou)",
        valor: -valorPago,
        tipo: 'pagamento'
    });

    salvarDados();
    atualizarTelas();
    document.getElementById('valorPago').value = '';
}

// EXCLUIR HISTÓRICO DE SALDO OU PAGAMENTO
function excluirSaldo(id, valor, tipo) {
    if (confirm("Atenção: Excluir este registro vai alterar o saldo total da empresa. Deseja continuar?")) {
        // Desfaz o impacto que aquele item teve no saldo principal antes de deletar
        if (tipo === 'fechamento') {
            dados.saldoPendente -= valor; // Se era uma entrada que sumiu, diminui o saldo
        } else if (tipo === 'pagamento') {
            dados.saldoPendente -= valor; // Se era um pagamento (negativo), tirar ele soma de volta
        }

        dados.listaSaldo = dados.listaSaldo.filter(item => item.id !== id);
        salvarDados();
        atualizarTelas();
    }
}

// ATUALIZAR INTERFACE
function atualizarTelas() {
    // Atualiza visor principal
    document.getElementById('saldoTotal').innerText = `R$ ${dados.saldoPendente.toFixed(2)}`;
    
    // Muda a cor do visor baseado no saldo
    if (dados.saldoPendente <= 0) {
        document.getElementById('saldoTotal').style.color = '#34d399'; // Verde se não deve nada
    } else {
        document.getElementById('saldoTotal').style.color = '#f43f5e'; // Vermelho se tem saldo a receber
    }

    // Atualiza tabela 1 (Horas)
    const tbodyHoras = document.getElementById('tabelaHoras');
    tbodyHoras.innerHTML = '';
    dados.listaHoras.forEach(item => {
        tbodyHoras.innerHTML += `<tr>
            <td>${item.data}</td>
            <td>${item.horas}h</td>
            <td>R$ ${item.valorHora.toFixed(2)}</td>
            <td>R$ ${item.total.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-delete" onclick="excluirHora(${item.id})">🗑️</button>
            </td>
        </tr>`;
    });

    // Atualiza tabela 2 (Extrato)
    const tbodySaldo = document.getElementById('tabelaSaldo');
    tbodySaldo.innerHTML = '';
    dados.listaSaldo.slice().reverse().forEach(item => {
        const corValor = item.valor < 0 ? 'color: #f43f5e;' : 'color: #34d399;';
        const sinal = item.valor < 0 ? '' : '+';
        tbodySaldo.innerHTML += `<tr>
            <td>${item.data}</td>
            <td>${item.descricao}</td>
            <td style="${corValor} font-weight: bold;">${sinal} R$ ${item.valor.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-delete" onclick="excluirSaldo(${item.id}, ${item.valor}, '${item.tipo}')">🗑️</button>
            </td>
        </tr>`;
    });
}

function salvarDados() {
    localStorage.setItem('dados_sistema', JSON.stringify(dados));
}

// Inicialização
atualizarTelas();