const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

// 1. Add useEffect to switch default detailViewMode
code = code.replace(
    `const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list' | 'by_workgroup'>('grouped');`,
    `const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list' | 'by_workgroup'>('grouped');
    
  // Default to 'by_workgroup' when filterMode is 'day' or 'week'
  React.useEffect(() => {
      if (filterMode === 'day' || filterMode === 'week') {
          setDetailViewMode('by_workgroup');
      } else {
          setDetailViewMode('grouped');
      }
  }, [filterMode]);`
);

// 2. Change the button condition
code = code.replace(
    `{filterMode === 'day' && (`,
    `{(filterMode === 'day' || filterMode === 'week') && (`
);

// 3. Change the render condition
code = code.replace(
    `) : (detailViewMode === 'by_workgroup' && filterMode === 'day') ? (`,
    `) : (detailViewMode === 'by_workgroup' && (filterMode === 'day' || filterMode === 'week')) ? (`
);

fs.writeFileSync('src/components/Analytics.tsx', code);
