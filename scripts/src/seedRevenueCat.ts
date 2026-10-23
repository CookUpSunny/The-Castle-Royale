import {
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_SUBSCRIPTION_PRODUCT_IDS,
  UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS,
} from '@workspace/monetization';
import { getUncachableRevenueCatClient } from './revenueCatClient';

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from '@replit/revenuecat-sdk';

const PROJECT_NAME = 'Castle Royale';

const APP_STORE_APP_NAME = 'Castle Royale iOS';
const APP_STORE_BUNDLE_ID = 'app.replit.thecastleroyale';
const PLAY_STORE_APP_NAME = 'Castle Royale Android';
const PLAY_STORE_PACKAGE_NAME = 'app.replit.thecastleroyale';

const ENTITLEMENT_IDENTIFIER = PREMIUM_ENTITLEMENT_ID;
const ENTITLEMENT_DISPLAY_NAME = 'Premium Access';

const OFFERING_IDENTIFIER = 'default';
const OFFERING_DISPLAY_NAME = 'Default Offering';

/**
 * App Store subscription group "The Castle Royale VIP" (22108578).
 * Prices stay in App Store Connect. This seed does not invent them.
 * beginner_luck and 004 are created so they can be imported, and are not
 * attached to `premium` until the owner decides what they unlock.
 */
const SUBSCRIPTIONS = [
  {
    storeIdentifier: 'monthly_high_roller',
    displayName: 'Monthly High Roller',
    duration: 'P1M',
    packageLookup: '$rc_monthly',
    packageDisplayName: 'Monthly',
  },
  {
    storeIdentifier: 'vip_year',
    displayName: 'VIP Year',
    duration: 'P1Y',
    packageLookup: '$rc_annual',
    packageDisplayName: 'Yearly',
  },
] as const;

const NON_CONSUMABLES = [
  { storeIdentifier: 'beginner_luck', displayName: "Beginner's Luck" },
  { storeIdentifier: '004', displayName: 'The Castle Kingdom' },
] as const;

if (SUBSCRIPTIONS.map((item) => item.storeIdentifier).join() !== PREMIUM_SUBSCRIPTION_PRODUCT_IDS.join()) {
  throw new Error('Seed subscriptions no longer match PREMIUM_SUBSCRIPTION_PRODUCT_IDS');
}
if (NON_CONSUMABLES.map((item) => item.storeIdentifier).join() !== UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS.join()) {
  throw new Error('Seed non-consumables no longer match UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS');
}

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });

  if (listProjectsError) throw new Error('Failed to list projects');

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);

  if (existingProject) {
    console.log('Project already exists:', existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error: createProjectError } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (createProjectError) throw new Error('Failed to create project');
    console.log('Created project:', newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error('No apps found');
  }

  let app: App | undefined = apps.items.find((a) => a.type === 'test_store');
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === 'app_store');
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === 'play_store');

  if (!app) {
    throw new Error('No app with test store found');
  } else {
    console.log('App with test store found:', app.id);
  }

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: 'app_store',
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error) throw new Error('Failed to create App Store app');
    appStoreApp = newApp;
    console.log('Created App Store app:', appStoreApp.id);
  } else {
    console.log('App Store app found:', appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: 'play_store',
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error) throw new Error('Failed to create Play Store app');
    playStoreApp = newApp;
    console.log('Created Play Store app:', playStoreApp.id);
  } else {
    console.log('Play Store app found:', playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });

  if (listProductsError) throw new Error('Failed to list products');

  const ensureProductForApp = async (
    targetApp: App,
    label: string,
    productIdentifier: string,
    body: CreateProductData['body'],
  ): Promise<Product> => {
    const existingProduct = existingProducts.items?.find(
      (p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id,
    );

    if (existingProduct) {
      console.log(label + ' product already exists:', existingProduct.id);
      return existingProduct;
    }

    const { data: createdProduct, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });

    if (error) throw new Error('Failed to create ' + label + ' product ' + productIdentifier);
    console.log('Created ' + label + ' product:', createdProduct.id, productIdentifier);
    return createdProduct;
  };

  const premiumProducts: Product[] = [];
  for (const subscription of SUBSCRIPTIONS) {
    const testStoreProduct = await ensureProductForApp(app, 'Test Store', subscription.storeIdentifier, {
      store_identifier: subscription.storeIdentifier,
      app_id: app.id,
      type: 'subscription',
      display_name: subscription.displayName,
      title: subscription.displayName,
      subscription: { duration: subscription.duration },
    });
    const appStoreProduct = await ensureProductForApp(appStoreApp, 'App Store', subscription.storeIdentifier, {
      store_identifier: subscription.storeIdentifier,
      app_id: appStoreApp.id,
      type: 'subscription',
      display_name: subscription.displayName,
    });
    premiumProducts.push(testStoreProduct, appStoreProduct);
  }

  for (const product of NON_CONSUMABLES) {
    await ensureProductForApp(appStoreApp, 'App Store', product.storeIdentifier, {
      store_identifier: product.storeIdentifier,
      app_id: appStoreApp.id,
      type: 'non_consumable',
      display_name: product.displayName,
    });
  }

  console.log(
    'Leaving beginner_luck and 004 off the premium entitlement. Prices stay in App Store Connect.',
  );

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listEntitlementsError) throw new Error('Failed to list entitlements');

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);

  if (existingEntitlement) {
    console.log('Entitlement already exists:', existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: ENTITLEMENT_IDENTIFIER,
        display_name: ENTITLEMENT_DISPLAY_NAME,
      },
    });
    if (error) throw new Error('Failed to create entitlement');
    console.log('Created entitlement:', newEntitlement.id);
    entitlement = newEntitlement;
  }

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: {
      product_ids: premiumProducts.map((product) => product.id),
    },
  });

  if (attachEntitlementError) {
    if (attachEntitlementError.type === 'unprocessable_entity_error') {
      console.log('Product already attached to entitlement');
    } else {
      throw new Error('Failed to attach products to entitlement');
    }
  } else {
    console.log('Attached products to entitlement');
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listOfferingsError) throw new Error('Failed to list offerings');

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);

  if (existingOffering) {
    console.log('Offering already exists:', existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: OFFERING_IDENTIFIER,
        display_name: OFFERING_DISPLAY_NAME,
      },
    });
    if (error) throw new Error('Failed to create offering');
    console.log('Created offering:', newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error('Failed to set offering as current');
    console.log('Set offering as current');
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });

  if (listPackagesError) throw new Error('Failed to list packages');

  for (const subscription of SUBSCRIPTIONS) {
    let pkg: Package | undefined = existingPackages.items?.find(
      (item) => item.lookup_key === subscription.packageLookup,
    );

    if (pkg) {
      console.log('Package already exists:', pkg.id, subscription.packageLookup);
    } else {
      const { data: newPackage, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: {
          lookup_key: subscription.packageLookup,
          display_name: subscription.packageDisplayName,
        },
      });
      if (error) throw new Error('Failed to create package ' + subscription.packageLookup);
      console.log('Created package:', newPackage.id, subscription.packageLookup);
      pkg = newPackage;
    }

    const productsForPackage = premiumProducts.filter(
      (product) => product.store_identifier === subscription.storeIdentifier,
    );
    const { error: attachPackageError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: productsForPackage.map((product) => ({
          product_id: product.id,
          eligibility_criteria: 'all' as const,
        })),
      },
    });

    if (attachPackageError) {
      if (
        attachPackageError.type === 'unprocessable_entity_error' &&
        attachPackageError.message?.includes('Cannot attach product')
      ) {
        console.log(
          'Skipping package attach for ' +
            subscription.packageLookup +
            '. If premium_monthly is still on this package, detach it and attach ' +
            subscription.storeIdentifier +
            '.',
        );
      } else {
        throw new Error('Failed to attach products to package ' + subscription.packageLookup);
      }
    } else {
      console.log('Attached ' + subscription.storeIdentifier + ' to ' + subscription.packageLookup);
    }
  }

  const { data: testStoreApiKeys, error: testStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: app.id },
  });
  if (testStoreApiKeysError) {
    throw new Error('Failed to list public API keys for Test Store app');
  }
  const { data: appStoreApiKeys, error: appStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  if (appStoreApiKeysError) {
    throw new Error('Failed to list public API keys for App Store app');
  }
  const { data: playStoreApiKeys, error: playStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });
  if (playStoreApiKeysError) {
    throw new Error('Failed to list public API keys for Play Store app');
  }

  console.log('\n====================');
  console.log('RevenueCat setup complete!');
  console.log('Project ID:', project.id);
  console.log('Test Store App ID:', app.id);
  console.log('App Store App ID:', appStoreApp.id);
  console.log('Play Store App ID:', playStoreApp.id);
  console.log(
    'Premium products:',
    premiumProducts.map((product) => product.store_identifier + ' (' + product.id + ')').join(', '),
  );
  console.log('Entitlement Identifier:', ENTITLEMENT_IDENTIFIER);
  console.log('Offering:', OFFERING_IDENTIFIER, 'packages $rc_monthly and $rc_annual');
  console.log(
    'Public API Keys - Test Store:',
    testStoreApiKeys?.items.map((item) => item.key).join(', ') ?? 'N/A',
  );
  console.log(
    'Public API Keys - App Store:',
    appStoreApiKeys?.items.map((item) => item.key).join(', ') ?? 'N/A',
  );
  console.log(
    'Public API Keys - Play Store:',
    playStoreApiKeys?.items.map((item) => item.key).join(', ') ?? 'N/A',
  );
  console.log('====================\n');
}

seedRevenueCat().catch(console.error);
