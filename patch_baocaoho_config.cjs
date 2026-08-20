const fs = require('fs');

// 1. Update PermissionStore.ts
let permCode = fs.readFileSync('src/store/PermissionStore.ts', 'utf8');
if (!permCode.includes('bao_cao_ho')) {
    permCode = permCode.replace(
        "'edit_others_workload': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],",
        "'edit_others_workload': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],\n    'bao_cao_ho': ['đội trưởng', 'giám đốc'],"
    );
    fs.writeFileSync('src/store/PermissionStore.ts', permCode, 'utf8');
}

// 2. Update SystemTab.tsx
let sysCode = fs.readFileSync('src/components/SystemTab.tsx', 'utf8');
if (!sysCode.includes('bao_cao_ho')) {
    sysCode = sysCode.replace(
        "{ id: 'edit_others_workload', label: 'Chỉnh sửa/Xóa báo cáo của người khác' }",
        "{ id: 'edit_others_workload', label: 'Chỉnh sửa/Xóa báo cáo của người khác' },\n    { id: 'bao_cao_ho', label: 'Cập nhật báo cáo hộ' }"
    );
    fs.writeFileSync('src/components/SystemTab.tsx', sysCode, 'utf8');
}

// 3. Update WorkloadForm.tsx
let formCode = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');
if (!formCode.includes('canBaoCaoHo = PermissionStore.hasActionAccess')) {
    formCode = formCode.replace(
        "const canEditOthers = PermissionStore.hasActionAccess('edit_others_workload', roleStr);",
        "const canEditOthers = PermissionStore.hasActionAccess('edit_others_workload', roleStr);\n      const canBaoCaoHo = PermissionStore.hasActionAccess('bao_cao_ho', roleStr);"
    );
    
    // Check where to wrap UI
    const oldUI = `<div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="baocaoho"`;
            
    const newUI = `{canBaoCaoHo && (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="baocaoho"`;
            
    const oldUIEnd = `Cập nhật báo cáo hộ (nhập công việc thay người khác)
          </label>
        </div>`;
        
    const newUIEnd = `Cập nhật báo cáo hộ (nhập công việc thay người khác)
          </label>
        </div>
        )}`;
    
    if (formCode.includes(oldUI)) {
        formCode = formCode.replace(oldUI, newUI);
        formCode = formCode.replace(oldUIEnd, newUIEnd);
    }
    fs.writeFileSync('src/components/WorkloadForm.tsx', formCode, 'utf8');
}

console.log("Patched System config for bao_cao_ho");
