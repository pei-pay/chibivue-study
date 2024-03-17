import { createRenderer } from '../runtime-core';
import { nodeOps } from './nodeOps';

const { render } = createRenderer(nodeOps);