const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldUploadCode = `    if (action === 'upload_image') {
       try {
           var folderId = '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv';
           var folder = DriveApp.getFolderById(folderId);
           var bytes = Utilities.base64Decode(payload.base64);
           var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
           var file = folder.createFile(blob);
           file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: file.getUrl() 
           })).setMimeType(ContentService.MimeType.JSON);
       } catch(e) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
       }
    }`;

const newUploadCode = `    if (action === 'upload_image') {
       try {
           // Tìm hoặc tạo thư mục "App_Images" ở thư mục gốc của Drive
           var folders = DriveApp.getFoldersByName("App_Images");
           var folder;
           if (folders.hasNext()) {
               folder = folders.next();
           } else {
               folder = DriveApp.createFolder("App_Images");
               folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           }
           var bytes = Utilities.base64Decode(payload.base64);
           var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
           var file = folder.createFile(blob);
           file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: file.getUrl() 
           })).setMimeType(ContentService.MimeType.JSON);
       } catch(e) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
       }
    }`;

content = content.replace(oldUploadCode, newUploadCode);

const oldSetup = `function setup() {
  DriveApp.getFiles();
  SpreadsheetApp.getActive();
}`;

const newSetup = `function setup() {
  DriveApp.createFolder("App_Images_Test_Permission").setTrashed(true);
  SpreadsheetApp.getActive();
}`;

content = content.replace(oldSetup, newSetup);

fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal.tsx for drive upload');
