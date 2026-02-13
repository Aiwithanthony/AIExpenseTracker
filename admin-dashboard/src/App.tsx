import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Subscribers from './pages/Subscribers';
import Payments from './pages/Payments';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/payments" element={<Payments />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

