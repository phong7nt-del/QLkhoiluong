const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/import PlanProgressTab from "\.\/components\/PlanProgressTab";/, `import PlanProgressTab from "./components/PlanProgressTab";
import BirthdayTab from "./components/BirthdayTab";`);
code = code.replace(/import \{ ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, Settings, Activity, Menu, WifiOff, ChevronUp, ChevronDown, KeyRound, Search, Package \} from "lucide-react";/, `import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, Settings, Activity, Menu, WifiOff, ChevronUp, ChevronDown, KeyRound, Search, Package, Gift } from "lucide-react";`);

fs.writeFileSync('src/App.tsx', code);
