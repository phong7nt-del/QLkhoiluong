const fs = require('fs');
let code = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

const newFetchLogics = `
  const fetchXuLyData = async () => {
      try {
          const data = await DataStore.getXuLyDoXa();
          setXuLyList(data);
      } catch (e) {
          console.error(e);
      }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await DataStore.syncMasterData(); 
      const khuVucList = DataStore.getKhuVuc();
      const mknData = DataStore.getMatKetNoi();
      const chiTietData = DataStore.getChiTietMKN();
      const stations = DataStore.getStations();
      
      // Wait, let's keep fetchXuLyData separate and call it in useEffect.
`;

code = code.replace(
  "const fetchData = async () => {\n    setLoading(true);\n    setError('');\n    \n    try {\n      await DataStore.syncMasterData(); \n      const khuVucList = DataStore.getKhuVuc();\n      const mknData = DataStore.getMatKetNoi();\n      const chiTietData = DataStore.getChiTietMKN();\n      const stations = DataStore.getStations();\n      const xuLyData = await DataStore.getXuLyDoXa();\n      setXuLyList(xuLyData);",
  `
  const fetchXuLyData = async () => {
      try {
          const data = await DataStore.getXuLyDoXa();
          setXuLyList(data);
      } catch (e) {
          console.error(e);
      }
  };

  const fetchData = async (force = false) => {
    if (overviewStats && !force) return;
    setLoading(true);
    setError('');
    
    try {
      await DataStore.syncMasterData(); 
      const khuVucList = DataStore.getKhuVuc();
      const mknData = DataStore.getMatKetNoi();
      const chiTietData = DataStore.getChiTietMKN();
      const stations = DataStore.getStations();
  `
);

code = code.replace(
  "  useEffect(() => {\n    fetchData();\n  }, [refreshToggle]);",
  "  useEffect(() => {\n    if (subTab === 'xuly') {\n        fetchXuLyData();\n    } else {\n        fetchData();\n    }\n  }, [refreshToggle]);\n\n  useEffect(() => {\n      if (subTab !== 'xuly') {\n          fetchData();\n      }\n  }, [subTab]);"
);

// We need to also check if we missed `const fetchData = async () => {` without force
// wait, we also have buttons calling `fetchData`. `onClick={fetchData}` needs to be changed to `onClick={() => fetchData(true)}` if they want to force. 
// Or since they don't have arguments, `onClick={() => { if (subTab==='xuly') fetchXuLyData(); else fetchData(true); }}` is better.

fs.writeFileSync('src/components/DisconnectRateTab.tsx', code, 'utf8');
