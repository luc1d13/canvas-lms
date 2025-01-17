/*
 * Copyright (C) 2021 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import axios from '@canvas/axios'
import {removeOutcomeGroup, moveOutcomeGroup, addOutcomeGroup, moveOutcome} from '../Management'

jest.mock('@canvas/axios')

describe('api', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('removeOutcomeGroup', () => {
    it('provides correct arguments to API request to delete group within account context', () => {
      removeOutcomeGroup('Account', '1', '2')
      expect(axios.delete).toHaveBeenCalledWith('/api/v1/accounts/1/outcome_groups/2')
    })

    it('provides correct arguments to API request to delete group within course context', () => {
      removeOutcomeGroup('Course', '1', '2')
      expect(axios.delete).toHaveBeenCalledWith('/api/v1/courses/1/outcome_groups/2')
    })
  })

  describe('moveGroup', () => {
    it('provides correct arguments to request to move group within account context', () => {
      moveOutcomeGroup('Account', '1', '2', '3')
      expect(axios.put).toHaveBeenCalledWith('/api/v1/accounts/1/outcome_groups/2', {
        parent_outcome_group_id: '3'
      })
    })

    it('provides correct arguments to API request to move group within course context', () => {
      moveOutcomeGroup('Course', '1', '2', '3')
      expect(axios.put).toHaveBeenCalledWith('/api/v1/courses/1/outcome_groups/2', {
        parent_outcome_group_id: '3'
      })
    })
  })

  describe('addOutcomeGroup', () => {
    it('provides correct arguments to request to move group within account context', () => {
      addOutcomeGroup('Account', '1', '2', 'new group title')
      expect(axios.post).toHaveBeenCalledWith('/api/v1/accounts/1/outcome_groups/2/subgroups', {
        title: 'new group title'
      })
    })

    it('provides correct arguments to API request to move group within course context', () => {
      addOutcomeGroup('Course', '1', '2', 'new group title')
      expect(axios.post).toHaveBeenCalledWith('/api/v1/courses/1/outcome_groups/2/subgroups', {
        title: 'new group title'
      })
    })
  })

  describe('moveOutcome', () => {
    it('provides correct arguments to API request to move outcome within account context', () => {
      moveOutcome('Account', '1', '2', '3', '4')
      expect(axios.put).toHaveBeenCalledWith('/api/v1/accounts/1/outcome_groups/4/outcomes/2', {
        move_from: '3'
      })
    })

    it('provides correct arguments to API request to move outcome within course context', () => {
      moveOutcome('Course', '1', '2', '3', '4')
      expect(axios.put).toHaveBeenCalledWith('/api/v1/courses/1/outcome_groups/4/outcomes/2', {
        move_from: '3'
      })
    })
  })
})
