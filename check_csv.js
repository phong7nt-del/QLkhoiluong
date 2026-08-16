const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=XuLyDoXa')
  .then(r => r.text())
  .then(t => console.log(t.substring(0, 500)));
