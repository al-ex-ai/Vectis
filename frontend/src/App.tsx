import { Routes, Route } from 'react-router-dom';
import Layout from '@components/Layout';
import ProtectedRoute from '@components/ProtectedRoute';
import Home from '@pages/Home';
import Projects from '@pages/Projects';
import Dashboard from '@pages/Dashboard';
import Connections from '@pages/Connections';
import Pipelines from '@pages/Pipelines';
import Runs from '@pages/Runs';
import RunDetail from '@pages/RunDetail';
import Flows from '@pages/Flows';
import FlowDesigner from '@pages/FlowDesigner';
import FlowRunDetail from '@pages/FlowRunDetail';
import PipelineDetail from '@pages/PipelineDetail';
import SchemaExplorer from '@pages/SchemaExplorer';
import Plugins from '@pages/Plugins';
import Schedules from '@pages/Schedules';
import Users from '@pages/Users';
import Login from '@pages/Login';
import Register from '@pages/Register';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/plugins" element={<Plugins />} />
        <Route path="/projects/:projectId" element={<Dashboard />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/connections/:connId/schema" element={<SchemaExplorer />} />
        <Route path="/projects/:projectId/schema" element={<SchemaExplorer />} />
        <Route path="/projects/:projectId/pipelines" element={<Pipelines />} />
        <Route path="/projects/:projectId/pipelines/:id" element={<PipelineDetail />} />
        <Route path="/projects/:projectId/runs" element={<Runs />} />
        <Route path="/projects/:projectId/runs/:id" element={<RunDetail />} />
        <Route path="/projects/:projectId/flows" element={<Flows />} />
        <Route path="/projects/:projectId/flows/:flowId" element={<FlowDesigner />} />
        <Route path="/projects/:projectId/flows/:flowId/runs/:flowRunId" element={<FlowRunDetail />} />
        <Route path="/projects/:projectId/schedules" element={<Schedules />} />
        <Route path="/team" element={<Users />} />
      </Route>
    </Routes>
  );
}
