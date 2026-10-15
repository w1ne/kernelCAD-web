// SPDX-License-Identifier: MIT
// Keep only usecase checks that fit the fast-test budget.
import { defineUsecaseSuite } from './usecaseSuite';

defineUsecaseSuite([{ id: 'usecase-keychain', budgetMs: 4_500 }]);
