import { HashRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider, useFinance } from './store';
import Layout from './components/Layout';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Subscriptions from './pages/Subscriptions';
import Accounts from './pages/Accounts';
import Investments from './pages/Investments';
import Budget from './pages/Budget';
import Reports from './pages/Reports';

function AppRoutes() {
  const { state } = useFinance();

  if (!state.settings.setupComplete) {
    return <Setup />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </FinanceProvider>
  );
}
