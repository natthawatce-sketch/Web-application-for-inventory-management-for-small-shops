import os

content = """<mxfile version="21.0.8">
  <diagram id="dfd1" name="DFD Level 1">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
"""

def add_node(nid, label, x, y, w, h, style):
    global content
    content += f'        <mxCell id="{nid}" value="{label}" style="{style}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" /></mxCell>\n'

def add_edge(eid, label, source, target):
    global content
    style = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;labelBackgroundColor=#ffffff;"
    content += f'        <mxCell id="{eid}" value="{label}" style="{style}" edge="1" parent="1" source="{source}" target="{target}"><mxGeometry relative="1" as="geometry" /></mxCell>\n'

style_entity = "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
style_process = "rounded=1;whiteSpace=wrap;html=1;arcSize=40;fillColor=#d5e8d4;strokeColor=#82b366;"
style_datastore = "shape=partialRectangle;right=0;left=0;whiteSpace=wrap;html=1;top=1;bottom=1;routingCenterY=0.5;snapToPoint=1;fillColor=#ffe6cc;strokeColor=#d79b00;"

# Entities
add_node("E_Admin_L", "ผู้ดูแลระบบ", 50, 400, 120, 60, style_entity)
add_node("E_Admin_R", "ผู้ดูแลระบบ", 1100, 450, 120, 60, style_entity)
add_node("E_Emp_T", "พนักงาน", 450, 50, 120, 60, style_entity)
add_node("E_Emp_B", "พนักงาน", 600, 750, 120, 60, style_entity)

# Processes
add_node("P1", "1.0<br>เข้าสู่ระบบ", 250, 150, 120, 80, style_process)
add_node("P2", "2.0<br>จัดการผู้ใช้", 250, 350, 120, 80, style_process)
add_node("P3", "3.0<br>จัดการสินค้า", 250, 550, 120, 80, style_process)
add_node("P4", "4.0<br>ขายสินค้า", 600, 150, 120, 80, style_process)
add_node("P5", "5.0<br>จัดการสต็อก", 600, 550, 120, 80, style_process)
add_node("P6", "6.0<br>แจ้งเตือน", 850, 650, 120, 80, style_process)
add_node("P7", "7.0<br>รายงาน", 850, 150, 120, 80, style_process)

# Data Stores
add_node("D1", "D1 ข้อมูลผู้ใช้งาน", 450, 250, 150, 40, style_datastore)
add_node("D2", "D2 ประเภทสินค้า", 450, 450, 150, 40, style_datastore)
add_node("D3", "D3 ข้อมูลสินค้า", 850, 250, 150, 40, style_datastore)
add_node("D4", "D4 สต็อกสินค้า", 850, 350, 150, 40, style_datastore)
add_node("D5", "D5 ข้อมูลการรับเข้า", 850, 450, 150, 40, style_datastore)
add_node("D6", "D6 ประวัติสต็อก", 850, 550, 150, 40, style_datastore)
add_node("D7", "D7 ข้อมูลการขาย", 1100, 50, 150, 40, style_datastore)
add_node("D8", "D8 รายละเอียดการขาย", 1100, 150, 150, 40, style_datastore)
add_node("D9", "D9 ข้อมูลแจ้งเตือน/หมดอายุ", 1100, 650, 150, 40, style_datastore)

eid = 1
def edge(label, src, tgt):
    global eid
    add_edge(f"e{eid}", label, src, tgt)
    eid += 1

# Connections
edge("บัญชี/รหัสผ่าน", "E_Admin_L", "P1")
edge("หน้าจอระบบ", "P1", "E_Admin_L")
edge("บัญชี/รหัสผ่าน", "E_Emp_T", "P1")
edge("หน้าจอระบบ", "P1", "E_Emp_T")
edge("ตรวจสอบข้อมูลผู้ใช้", "P1", "D1")
edge("ข้อมูลผู้ใช้", "D1", "P1")

edge("ข้อมูลเพิ่ม/ลบ/แก้ผู้ใช้", "E_Admin_L", "P2")
edge("สถานะจัดการผู้ใช้", "P2", "E_Admin_L")
edge("อัปเดตข้อมูลผู้ใช้", "P2", "D1")
edge("ข้อมูลผู้ใช้", "D1", "P2")

edge("ข้อมูลจัดการสินค้า", "E_Admin_L", "P3")
edge("ข้อมูลสินค้า", "P3", "E_Admin_L")
edge("รหัสประเภทสินค้า", "P3", "D2")
edge("ข้อมูลประเภทสินค้า", "D2", "P3")
edge("ข้อมูลสินค้าใหม่/อัปเดต", "P3", "D3")
edge("ข้อมูลสินค้า", "D3", "P3")
edge("ข้อมูลเพิ่มสต็อก", "P3", "D4")
edge("ข้อมูลประวัติสินค้า", "P3", "D6")

edge("คำค้นหา/ข้อมูลการขาย", "E_Emp_T", "P4")
edge("ใบเสร็จรับเงิน/สถานะ", "P4", "E_Emp_T")
edge("คำค้นหาสินค้า", "P4", "D3")
edge("ข้อมูลสินค้า", "D3", "P4")
edge("จำนวนสินค้าที่ขาย", "P4", "D4")
edge("จำนวนสินค้าคงเหลือ", "D4", "P4")
edge("ข้อมูลประวัติการลดสต็อก", "P4", "D6")
edge("ข้อมูลการขาย", "P4", "D7")
edge("ข้อมูลรายละเอียดการขาย", "P4", "D8")

edge("ข้อมูลปรับปรุงสต็อก", "E_Admin_L", "P5")
edge("สถานะการปรับปรุง", "P5", "E_Admin_L")
edge("ข้อมูลปรับปรุงสต็อก", "E_Emp_B", "P5")
edge("สถานะการปรับปรุง", "P5", "E_Emp_B")
edge("คำค้นหาสินค้า", "P5", "D3")
edge("ข้อมูลสินค้า", "D3", "P5")
edge("จำนวนสต็อกที่เปลี่ยนแปลง", "P5", "D4")
edge("จำนวนสต็อกคงเหลือ", "D4", "P5")
edge("ข้อมูลการรับเข้า", "P5", "D5")
edge("ข้อมูลประวัติเพิ่ม/แก้สต็อก", "P5", "D6")

edge("คำขอตรวจสอบแจ้งเตือน", "E_Admin_L", "P6")
edge("คำขอตรวจสอบแจ้งเตือน", "E_Emp_B", "P6")
edge("ข้อมูลการแจ้งเตือน", "P6", "E_Admin_R")
edge("ข้อมูลการแจ้งเตือน", "P6", "E_Emp_B")
edge("ข้อมูลสินค้า", "D3", "P6")
edge("ข้อมูลจำนวนสินค้า", "D4", "P6")
edge("ข้อมูลวันหมดอายุ", "D5", "P6")
edge("ข้อมูลสินค้าใกล้หมดอายุ", "P6", "D9")
edge("ข้อมูลใกล้หมดอายุ", "D9", "P6")

edge("คำขอรายงาน", "E_Admin_R", "P7")
edge("รายงานยอดขาย/สต็อก", "P7", "E_Admin_R")
edge("คำค้นหาสินค้า", "P7", "D3")
edge("ข้อมูลสินค้า", "D3", "P7")
edge("ข้อมูลสินค้าคงเหลือ", "D4", "P7")
edge("ข้อมูลการขาย", "D7", "P7")
edge("ข้อมูลรายละเอียดการขาย", "D8", "P7")

content += """      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""

with open("DFD_Level1_Corrected.drawio", "w", encoding="utf-8") as f:
    f.write(content)

print("DFD_Level1_Corrected.drawio generated successfully.")
