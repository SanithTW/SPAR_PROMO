import { Request, Response } from 'express';
import { productMasterClient } from '../integrations/productMaster/productMaster.client.js';
import { salesClient } from '../integrations/sales/sales.client.js';

export async function checkIntegrationsHealth(_req: Request, res: Response) {
  const [pmHealth, salesHealth] = await Promise.all([
    productMasterClient.checkHealth(),
    salesClient.checkHealth(),
  ]);

  return res.json({
    success: true,
    data: {
      productMaster: pmHealth.status,
      sales: salesHealth.status,
    },
  });
}
