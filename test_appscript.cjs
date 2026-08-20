// Generate script block to put in app script to debug why delete isn't working
const script = `
function doPost(e) {
    try {
        var payload = JSON.parse(e.postData.contents);
        if (payload.action === 'delete_workload_group') {
             // simplified delete logic to test
             return ContentService.createTextOutput(JSON.stringify({ status: 'success', test: true })).setMimeType(ContentService.MimeType.JSON);
        }
    } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}
`
console.log("Nothing to run locally, just debugging context")
