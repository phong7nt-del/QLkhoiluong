const fs = require('fs');

// 1. Fix DcuTab.tsx
let dcuContent = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
dcuContent = dcuContent.replace(
    /const newDcu = {\s*id,\s*ten,\s*toadoX,/g,
    "const newDcu = { id, ten, diaChi, toadoX,"
);
fs.writeFileSync('src/components/DcuTab.tsx', dcuContent, 'utf8');

// 2. Fix ConfigModal.tsx
let configContent = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const uploadFind = `           // Tìm hoặc tạo thư mục "App_Images" ở thư mục gốc của Drive
           var folders = DriveApp.getFoldersByName("App_Images");
           var folder;
           if (folders.hasNext()) {
               folder = folders.next();
           } else {
               folder = DriveApp.createFolder("App_Images");
               folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           }
           
           var b64 = payload.base64.split(',')[1] || payload.base64;
           var mime = payload.mimeType || 'image/jpeg';
           var fName = payload.fileName || ('IMG_' + new Date().getTime() + '.jpg');
           var blob = Utilities.newBlob(bytes, mime, fName);
           var file = folder.createFile(blob);
           file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: file.getUrl() 
           })).setMimeType(ContentService.MimeType.JSON);`;

const uploadReplace = `           var folder = DriveApp.getFolderById("1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv");
           
           var b64 = payload.base64.split(',')[1] || payload.base64;
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var fName = payload.fileName || ('IMG_' + new Date().getTime() + '.jpg');
           var blob = Utilities.newBlob(bytes, mime, fName);
           var file = folder.createFile(blob);
           file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: "https://drive.google.com/uc?id=" + file.getId()
           })).setMimeType(ContentService.MimeType.JSON);`;

// Wait, the original code had 'var bytes = Utilities.base64Decode(b64);' which I missed in uploadFind. Let's use regex or just replace the whole action.

