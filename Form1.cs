using System;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using Newtonsoft.Json; // Certifique-se de instalar este pacote via NuGet se houver aviso

namespace GerenciadorDeHoras
{
    public partial class Form1 : Form
    {
        // Caminho do arquivo onde tudo ficará salvo na pasta do programa
        private string caminhoArquivo = Path.Combine(Application.StartupPath, "dados_sistema.json");
        private DadosSistema dados = new DadosSistema();

        public Form1()
        {
            InitializeComponent();
            CarregarDados();
        }

        // ==========================================
        // ABA 1 - CARGA HORÁRIA
        // ==========================================

        // Botão: Lançar Horas
        private void btnLancarHoras_Click(object sender, EventArgs e)
        {
            if (double.TryParse(txtHoras.Text, out double horas) && double.TryParse(txtValorHora.Text, out double valorHora))
            {
                var novoLancamento = new LancamentoHora
                {
                    Data = dtpData.Value,
                    HorasTrabalhadas = horas,
                    ValorPorHora = valorHora
                };

                dados.ListaHoras.Add(novoLancamento);
                SalvarDados();
                AtualizarTelas();
                
                txtHoras.Clear();
                MessageBox.Show("Horas lançadas com sucesso!", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show("Por favor, insira valores válidos para horas e valor.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // Botão: Fechar Mês (Soma tudo trabalhado e joga no saldo que a empresa deve)
        private void btnFecharMes_Click(object sender, EventArgs e)
        {
            if (dados.ListaHoras.Count == 0)
            {
                MessageBox.Show("Não há horas registradas para fechar o mês.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // Calcula o total acumulado na tabela de horas
            double totalTrabalhadoNoMes = dados.ListaHoras.Sum(h => h.TotalDoDia);

            // 1. Soma ao Saldo Pendente Geral
            dados.SaldoPendente += totalTrabalhadoNoMes;

            // 2. Registra no histórico de saldos como um crédito (Entrada)
            dados.ListaSaldo.Add(new HistoricoSaldo
            {
                Data = DateTime.Now,
                Descricao = $"Fechamento de Mês ({dados.ListaHoras.Count} lançamentos)",
                Valor = totalTrabalhadoNoMes
            });

            // 3. Limpa a tabela de horas trabalhadas para o próximo mês
            dados.ListaHoras.Clear();

            SalvarDados();
            AtualizarTelas();

            MessageBox.Show($"Mês fechado! R$ {totalTrabalhadoNoMes:N2} foram adicionados ao seu saldo pendente.", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        // ==========================================
        // ABA 2 - SALÁRIO & PAGAMENTOS (SUBTRAÇÃO)
        // ==========================================

        // Botão: Registrar Pagamento
        private void btnRegistrarPagamento_Click(object sender, EventArgs e)
        {
            if (double.TryParse(txtValorPago.Text, out double valorPago) && valorPago > 0)
            {
                // Subtrai o valor que a empresa pagou do saldo pendente
                dados.SaldoPendente -= valorPago;

                // Registra no histórico como um valor negativo (Saída)
                dados.ListaSaldo.Add(new HistoricoSaldo
                {
                    Data = DateTime.Now,
                    Descricao = "Pagamento Recebido (Empresa pagou)",
                    Valor = -valorPago // Salva negativo para diferenciar no extrato
                });

                SalvarDados();
                AtualizarTelas();

                txtValorPago.Clear();
                MessageBox.Show($"Pagamento de R$ {valorPago:N2} registrado e deduzido do saldo pendente!", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show("Por favor, digite um valor de pagamento válido.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // ==========================================
        // FUNÇÕES DE SISTEMA (SALVAR / CARREGAR / ATUALIZAR)
        // ==========================================

        private void AtualizarTelas()
        {
            // Atualiza o texto do Saldo Pendente na Tela 2
            lblSaldoTotal.Text = $"R$ {dados.SaldoPendente:N2}";

            // Atualiza os DataGridViews automaticamente fazendo o refresh dos dados
            dgvHoras.DataSource = null;
            dgvHoras.DataSource = dados.ListaHoras.OrderBy(h => h.Data).ToList();

            dgvHistoricoSaldo.DataSource = null;
            dgvHistoricoSaldo.DataSource = dados.ListaSaldo.OrderByDescending(s => s.Data).ToList();
        }

        private void SalvarDados()
        {
            try
            {
                string json = JsonConvert.SerializeObject(dados, Formatting.Indented);
                File.WriteAllText(caminhoArquivo, json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao salvar dados: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void CarregarDados()
        {
            try
            {
                if (File.Exists(caminhoArquivo))
                {
                    string json = File.ReadAllText(caminhoArquivo);
                    dados = JsonConvert.DeserializeObject<DadosSistema>(json) ?? new DadosSistema();
                }
                AtualizarTelas();
            }
            catch
            {
                dados = new DadosSistema();
                System.Diagnostics.Debug.WriteLine("Criando novo arquivo de dados por falha ou inexistência.");
            }
        }
    }
}