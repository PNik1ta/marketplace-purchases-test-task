import BigNumber from 'bignumber.js';
import dataSource from './data-source';
import { AccountEntity } from '../account/entities/account.entity';
import { ItemEntity } from '../item/entities/item.entity';
import { ItemStatus } from '../item/enums/item-status';

const DEMO_SELLER_ID = '00000000-0000-4000-8000-000000000001';

const DEMO_BUYER_ID = '00000000-0000-4000-8000-000000000002';

const DEMO_ITEM_ID = '00000000-0000-4000-8000-000000000003';

async function seedDemoData(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const accountRepository = manager.getRepository(AccountEntity);

      const itemRepository = manager.getRepository(ItemEntity);

      const demoItemExists = await itemRepository.existsBy({
        id: DEMO_ITEM_ID,
      });

      if (demoItemExists) {
        console.log('Demo data already exists, skipping seed');

        return;
      }

      await accountRepository.insert([
        {
          id: DEMO_SELLER_ID,
          balance: new BigNumber('100.00'),
        },
        {
          id: DEMO_BUYER_ID,
          balance: new BigNumber('500.00'),
        },
      ]);

      await itemRepository.insert({
        id: DEMO_ITEM_ID,
        sellerId: DEMO_SELLER_ID,
        price: new BigNumber('150.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      });

      console.log('Demo data created');
      console.log({
        buyerId: DEMO_BUYER_ID,
        sellerId: DEMO_SELLER_ID,
        itemId: DEMO_ITEM_ID,
        expectedItemVersion: 1,
      });
    });
  } finally {
    await dataSource.destroy();
  }
}

seedDemoData().catch((error: unknown) => {
  console.error('Failed to seed demo data', error);

  process.exit(1);
});
