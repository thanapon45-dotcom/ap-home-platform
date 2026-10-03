export default function ArchitecturePage() {
  const diagrams = [
    ["L0","Platform Overview","00_Master_Overview.svg"],
    ["L1","Actual System Architecture","01_Actual_System_Architecture.svg"],
    ["L2","Module & Capability Map","02_Module_Capability_Map.svg"],
    ["L3","Data Flow","03_Data_Flow.svg"],
    ["L4","Brains & Assistant Architecture","04_Brain_Assistant_Architecture.svg"],
    ["L5","Business Workflows","05_Business_Workflows.svg"],
    ["L6","API & Integration Map","06_API_Integration_Map.svg"],
    ["L7","Infrastructure & Security","07_Infrastructure_Security.svg"],
    ["L8","Implementation Gap Map","08_Implementation_Gap_Map.svg"],
  ];
  return <main style={{maxWidth:1500,margin:"0 auto",padding:"32px",fontFamily:"Arial,sans-serif"}}>
    <h1>AP Home Platform — Audited Architecture</h1>
    <p>Evidence snapshot: 2026-10-03. Controlled by Current-State Evidence Matrix and Conflict Register. Runtime-only claims remain UNVERIFIED.</p>
    {diagrams.map(([level,title,file])=><section key={level} style={{margin:"36px 0 56px"}}>
      <h2>{level} — {title}</h2>
      <img src={"/architecture/"+file} alt={level+" — "+title} style={{width:"100%",height:"auto",border:"1px solid #334155",borderRadius:12}} />
    </section>)}
  </main>;
}
