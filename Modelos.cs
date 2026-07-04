using System;
using System.Collections.Generic;

namespace GerenciadorDeHoras
{
    // Estrutura para salvar cada dia de trabalho
    public class LancamentoHora
    {
        public DateTime Data { get; set; }
        public double HorasTrabalhadas { get; set; }
        public double ValorPorHora { get; set; }
        public double TotalDoDia => HorasTrabalhadas * ValorPorHora;
    }

    // Estrutura para o extrato de saldos (Entradas e Pagamentos)
    public class HistoricoSaldo
    {
        public DateTime Data { get; set; }
        public string Descricao { get; set; } // Ex: "Fechamento de Mês"
        public double Valor { get; set; }     // Valores positivos ou negativos
    }

    // Estrutura geral que junta tudo
    public class DadosSistema
    {
        public double SaldoPendente { get; set; } = 0;
        public List<LancamentoHora> ListaHoras { get; set; } = new List<LancamentoHora>();
        public List<HistoricoSaldo> ListaSaldo { get; set; } = new List<HistoricoSaldo>();
    }
}