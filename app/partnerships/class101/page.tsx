import Header from "@/components/header";
import Class101Workflow from "@/components/partnerships/class101-workflow";

export default function Class101Page() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header title="📦 클래스101 파트너스" />
      <div style={{ flex: 1, overflow: "hidden", background: "#F7F7F8" }}>
        <Class101Workflow />
      </div>
    </div>
  );
}
