import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function formatarDuracao(ms) {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function App() {
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [agora, setAgora] = useState(Date.now())

  const [nome, setNome] = useState('')
  const [numeroTlm, setNumeroTlm] = useState('')
  const [valorPago, setValorPago] = useState('')

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('entradas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setEntradas(data)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  // Atualiza o relógio a cada minuto para o tempo "ao vivo" de quem está dentro.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  async function adicionar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setErro(null)
    const { error } = await supabase.from('entradas').insert({
      nome: nome.trim(),
      numero_tlm: numeroTlm.trim() || null,
      valor_pago: valorPago === '' ? 0 : Number(valorPago),
      hora_entrada: null,
      saida: false,
    })
    if (error) {
      setErro(error.message)
      return
    }
    setNome('')
    setNumeroTlm('')
    setValorPago('')
    carregar()
  }

  // Dá a entrada: marca a hora de entrada e arranca o cronómetro.
  async function darEntrada(entrada) {
    const { error } = await supabase
      .from('entradas')
      .update({ hora_entrada: new Date().toISOString() })
      .eq('id', entrada.id)
    if (error) setErro(error.message)
    else carregar()
  }

  async function alternarSaida(entrada) {
    const vaiSair = !entrada.saida
    const { error } = await supabase
      .from('entradas')
      .update({
        saida: vaiSair,
        hora_saida: vaiSair ? new Date().toISOString() : null,
      })
      .eq('id', entrada.id)
    if (error) setErro(error.message)
    else carregar()
  }

  async function apagar(id) {
    if (!confirm('Apagar este registo?')) return
    const { error } = await supabase.from('entradas').delete().eq('id', id)
    if (error) setErro(error.message)
    else carregar()
  }

  function duracaoMs(e) {
    if (!e.hora_entrada) return 0
    const inicio = new Date(e.hora_entrada).getTime()
    const fim = e.saida && e.hora_saida ? new Date(e.hora_saida).getTime() : agora
    return fim - inicio
  }

  function tempoDentro(e) {
    if (!e.hora_entrada) return '—'
    return formatarDuracao(duracaoMs(e))
  }

  // destaca quem está dentro há mais de 30 minutos
  function excede30(e) {
    return e.hora_entrada && !e.saida && duracaoMs(e) > 30 * 60 * 1000
  }

  // chip de situação: rótulo + classe de cor
  function situacao(e) {
    if (e.saida) return { texto: 'Saiu', classe: 'chip-saiu' }
    if (!e.hora_entrada) return { texto: 'Por entrar', classe: 'chip-pendente' }
    if (excede30(e)) return { texto: '+30 min', classe: 'chip-aviso' }
    return { texto: 'Dentro', classe: 'chip-dentro' }
  }

  // só conta como "dentro" quem já deu entrada e ainda não saiu
  const dentro = entradas.filter((e) => e.hora_entrada && !e.saida).length
  const totalPago = entradas.reduce((s, e) => s + Number(e.valor_pago || 0), 0)

  return (
    <div className="container">
      <header className="topo">
        <div className="topo-titulo">
          <span className="logo">🎟️</span>
          <div>
            <h1>Portaria do Evento</h1>
            <p className="subtitulo">Gestão de entradas e saídas</p>
          </div>
        </div>
      </header>

      <div className="stats">
        <div className="stat stat-total">
          <span className="stat-icon">📋</span>
          <div className="stat-info">
            <span className="num">{entradas.length}</span>
            <span className="label">Registos</span>
          </div>
        </div>
        <div className="stat stat-dentro">
          <span className="stat-icon">🟢</span>
          <div className="stat-info">
            <span className="num">{dentro}</span>
            <span className="label">Dentro</span>
          </div>
        </div>
        <div className="stat stat-pago">
          <span className="stat-icon">💶</span>
          <div className="stat-info">
            <span className="num">{totalPago.toFixed(2)} €</span>
            <span className="label">Recebido</span>
          </div>
        </div>
      </div>

      <form onSubmit={adicionar} className="form">
        <h2 className="form-titulo">Adicionar pessoa</h2>
        <div className="form-campos">
          <label className="campo">
            <span>Nome</span>
            <input
              placeholder="Ex.: Maria Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Telemóvel</span>
            <input
              placeholder="9xx xxx xxx"
              value={numeroTlm}
              onChange={(e) => setNumeroTlm(e.target.value)}
            />
          </label>
          <label className="campo campo-valor">
            <span>Valor pago (€)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className="btn-novo">
          + Novo Registo
        </button>
      </form>

      {erro && <p className="erro">⚠️ {erro}</p>}

      {loading ? (
        <p>A carregar…</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telemóvel</th>
              <th>Situação</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Tempo</th>
              <th>Pago</th>
              <th>Ação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 && (
              <tr>
                <td colSpan={9} className="vazio">
                  <span className="vazio-emoji">📭</span>
                  Ainda sem registos. Adiciona a primeira pessoa acima.
                </td>
              </tr>
            )}
            {entradas.map((e) => (
              <tr
                key={e.id}
                className={`${e.saida ? 'saiu' : ''} ${
                  excede30(e) ? 'excede-30' : ''
                }`.trim()}
              >
                <td data-label="Nome" className="cel-nome">
                  {e.nome}
                </td>
                <td data-label="Telemóvel">{e.numero_tlm || '—'}</td>
                <td data-label="Situação">
                  <span className={`chip ${situacao(e).classe}`}>
                    {situacao(e).texto}
                  </span>
                </td>
                <td data-label="Entrada">
                  {e.hora_entrada
                    ? new Date(e.hora_entrada).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td data-label="Saída">
                  {e.saida && e.hora_saida
                    ? new Date(e.hora_saida).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td data-label="Tempo">{tempoDentro(e)}</td>
                <td data-label="Pago">{Number(e.valor_pago).toFixed(2)} €</td>
                <td data-label="Ação">
                  {!e.hora_entrada ? (
                    <button className="btn-entrada" onClick={() => darEntrada(e)}>
                      Dar entrada
                    </button>
                  ) : (
                    <button
                      className={e.saida ? 'btn-saiu' : 'btn-dentro'}
                      onClick={() => alternarSaida(e)}
                    >
                      {e.saida ? 'Saiu' : 'Marcar saída'}
                    </button>
                  )}
                </td>
                <td data-label="" className="cel-apagar">
                  <button className="btn-apagar" onClick={() => apagar(e.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
