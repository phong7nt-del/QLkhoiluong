import fs from 'fs';
let code = fs.readFileSync('src/components/ProgressTab.tsx', 'utf-8');

code = code.replace(
`                      </div>
                   );
                })}
             </div>`,
`                      </div>
                      </div>
                   );
                })}
             </div>`
);

fs.writeFileSync('src/components/ProgressTab.tsx', code);
