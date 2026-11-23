import { Request, Response } from 'express';
import { productMasterClient } from '../integrations/productMaster/productMaster.client.js';
import { salesClient } from '../integrations/sales/sales.client.js';
import { fabricClient } from '../integrations/fabric/fabric.client.js';

export async function checkIntegrationsHealth(_req: Request, res: Response) {
  const [pmHealth, salesHealth, fabricHealth] = await Promise.all([
    productMasterClient.checkHealth(),
    salesClient.checkHealth(),
    fabricClient.checkHealth(),
  ]);

  return res.json({
    success: true,
    data: {
      productMaster: pmHealth.status,
      sales: salesHealth.status,
      fabric: fabricHealth.status,
    },
  });
}
