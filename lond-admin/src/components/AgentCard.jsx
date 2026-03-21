// AgentCard — แสดงข้อมูลนายหน้าแบบ mini card (read-only) ใช้ได้ทุกหน้าฝ่าย
export default function AgentCard({ agentName, agentPhone, agentCode, style }) {
  if (!agentName) return null
  return (
    <div style={{
      background: '#f0f7ff', border: '1.5px solid #bbdefb', borderRadius: 12,
      padding: '12px 16px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 12,
      ...style
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#1565C0,#1976d2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: 15
      }}>
        {agentName[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {agentCode && (
            <span style={{
              padding: '1px 7px', background: '#1565C0', color: '#fff',
              borderRadius: 10, fontSize: 10, fontWeight: 700
            }}>{agentCode}</span>
          )}
          <span style={{ fontWeight: 700, color: '#1565C0', fontSize: 13 }}>{agentName}</span>
        </div>
        {agentPhone && (
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
            <i className="fas fa-phone" style={{ color: '#1565C0', marginRight: 4, fontSize: 10 }}></i>
            {agentPhone}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#90a4ae', fontWeight: 600, whiteSpace: 'nowrap' }}>
        <i className="fas fa-handshake" style={{ marginRight: 3 }}></i>นายหน้า
      </div>
    </div>
  )
}
