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

import {AlertManagerContext} from '@canvas/alerts/react/AlertManager'
import {CollapseReplies} from '../../components/CollapseReplies/CollapseReplies'
import {
  CREATE_DISCUSSION_ENTRY,
  DELETE_DISCUSSION_ENTRY,
  UPDATE_DISCUSSION_ENTRY_PARTICIPANT,
  UPDATE_DISCUSSION_ENTRY
} from '../../../graphql/Mutations'
import {Discussion} from '../../../graphql/Discussion'
import {DISCUSSION_SUBENTRIES_QUERY} from '../../../graphql/Queries'
import {DiscussionEdit} from '../../components/DiscussionEdit/DiscussionEdit'
import {Flex} from '@instructure/ui-flex'
import I18n from 'i18n!discussion_topics_post'
import LoadingIndicator from '@canvas/loading-indicator'
import {PER_PAGE, SearchContext} from '../../utils/constants'
import PropTypes from 'prop-types'
import React, {useContext, useEffect, useRef, useState} from 'react'
import {ThreadActions} from '../../components/ThreadActions/ThreadActions'
import {ThreadingToolbar} from '../../components/ThreadingToolbar/ThreadingToolbar'
import {useMutation, useQuery} from 'react-apollo'
import {View} from '@instructure/ui-view'
import {
  getSpeedGraderUrl,
  addReplyToDiscussionEntry,
  addReplyToSubentries,
  addReplyToDiscussion
} from '../../utils'
import theme from '@instructure/canvas-theme'
import {IsolatedViewContainer} from '../IsolatedViewContainer/IsolatedViewContainer'
import {PostMessageContainer} from '../PostMessageContainer/PostMessageContainer'

export const mockThreads = {
  discussionEntry: {
    id: '432',
    author: {
      name: 'Jeffrey Johnson',
      avatarUrl: 'someURL'
    },
    createdAt: '2021-02-08T13:36:05-07:00',
    message:
      '<p>This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends. This is the post that never ends. It goes on and on my friends.</p>',
    read: true,
    lastReply: null,
    rootEntryParticipantCounts: {
      unreadCount: 0,
      repliesCount: 0
    },
    subentriesCount: 0,
    permissions: {
      attach: true,
      create: true,
      delete: true,
      rate: true,
      read: true,
      reply: true,
      update: true,
      viewRating: true
    }
  }
}

const courseID = window.ENV?.course_id !== null ? parseInt(window.ENV?.course_id, 10) : -1

export const DiscussionThreadContainer = props => {
  const {sort} = useContext(SearchContext)
  const {setOnFailure, setOnSuccess} = useContext(AlertManagerContext)
  const [expandReplies, setExpandReplies] = useState(false)
  const [openIsolatedView, setOpenIsolatedView] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editorExpanded, setEditorExpanded] = useState(false)
  const threadRef = useRef()

  const updateCache = (cache, result) => {
    const newDiscussionEntry = result.data.createDiscussionEntry.discussionEntry

    addReplyToDiscussion(cache, props.discussionTopic.id)
    addReplyToDiscussionEntry(cache, props.discussionEntry.id, newDiscussionEntry)
    addReplyToSubentries(cache, props.discussionEntry._id, sort, newDiscussionEntry, courseID)
  }

  const [createDiscussionEntry] = useMutation(CREATE_DISCUSSION_ENTRY, {
    update: updateCache,
    onCompleted: () => {
      setOnSuccess(I18n.t('The discussion entry was successfully created.'))
    },
    onError: () => {
      setOnFailure(I18n.t('There was an unexpected error creating the discussion entry.'))
    }
  })

  const [deleteDiscussionEntry] = useMutation(DELETE_DISCUSSION_ENTRY, {
    onCompleted: data => {
      if (!data.deleteDiscussionEntry.errors) {
        setOnSuccess(I18n.t('The reply was successfully deleted.'))
      } else {
        setOnFailure(I18n.t('There was an unexpected error while deleting the reply.'))
      }
    },
    onError: () => {
      setOnFailure(I18n.t('There was an unexpected error while deleting the reply.'))
    }
  })

  const [updateDiscussionEntry] = useMutation(UPDATE_DISCUSSION_ENTRY, {
    onCompleted: data => {
      if (!data.updateDiscussionEntry.errors) {
        setOnSuccess(I18n.t('The reply was successfully updated.'))
        setIsEditing(false)
      } else {
        setOnFailure(I18n.t('There was an unexpected error while updating the reply.'))
      }
    },
    onError: () => {
      setOnFailure(I18n.t('There was an unexpected error while updating the reply.'))
    }
  })

  const [updateDiscussionEntryParticipant] = useMutation(UPDATE_DISCUSSION_ENTRY_PARTICIPANT, {
    onCompleted: data => {
      if (!data || !data.updateDiscussionEntryParticipant) {
        return null
      }
      setOnSuccess(I18n.t('The reply was successfully updated.'))
    },
    onError: () => {
      setOnFailure(I18n.t('There was an unexpected error updating the reply.'))
    }
  })

  const toggleRating = () => {
    updateDiscussionEntryParticipant({
      variables: {
        discussionEntryId: props.discussionEntry._id,
        rating: props.discussionEntry.rating ? 'not_liked' : 'liked'
      }
    })
  }

  const toggleUnread = () => {
    updateDiscussionEntryParticipant({
      variables: {
        discussionEntryId: props.discussionEntry._id,
        read: !props.discussionEntry.read,
        forcedReadState: props.discussionEntry.read || null
      }
    })
  }

  const marginDepth = `calc(${theme.variables.spacing.xxLarge} * ${props.depth})`
  const replyMarginDepth = `calc(${theme.variables.spacing.xxLarge} * ${props.depth + 1})`

  const threadActions = []
  if (props.discussionEntry.permissions.reply) {
    threadActions.push(
      <ThreadingToolbar.Reply
        key={`reply-${props.discussionEntry.id}`}
        authorName={props.discussionEntry.author.name}
        delimiterKey={`reply-delimiter-${props.discussionEntry.id}`}
        onClick={() => {
          setEditorExpanded(!editorExpanded)
        }}
      />
    )
  }
  if (
    props.discussionEntry.permissions.viewRating &&
    (props.discussionEntry.permissions.rate || props.discussionEntry.ratingSum > 0)
  ) {
    threadActions.push(
      <ThreadingToolbar.Like
        key={`like-${props.discussionEntry.id}`}
        delimiterKey={`like-delimiter-${props.discussionEntry.id}`}
        onClick={toggleRating}
        authorName={props.discussionEntry.author.name}
        isLiked={props.discussionEntry.rating}
        likeCount={props.discussionEntry.ratingSum || 0}
        interaction={props.discussionEntry.permissions.rate ? 'enabled' : 'disabled'}
      />
    )
  }

  if (props.depth === 0 && props.discussionEntry.lastReply) {
    threadActions.push(
      <ThreadingToolbar.Expansion
        key={`expand-${props.discussionEntry.id}`}
        delimiterKey={`expand-delimiter-${props.discussionEntry.id}`}
        expandText={I18n.t(
          {one: '%{count} reply, %{unread} unread', other: '%{count} replies, %{unread} unread'},
          {
            count: props.discussionEntry.rootEntryParticipantCounts?.repliesCount,
            unread: props.discussionEntry.rootEntryParticipantCounts?.unreadCount
          }
        )}
        onClick={() => {
          if (ENV.isolated_view) {
            setOpenIsolatedView(!openIsolatedView)
          } else {
            setExpandReplies(!expandReplies)
          }
        }}
        isExpanded={expandReplies}
      />
    )
  }

  const onDelete = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(I18n.t('Are you sure you want to delete this entry?'))) {
      deleteDiscussionEntry({
        variables: {
          id: props.discussionEntry._id
        }
      })
    }
  }

  const onUpdate = newMesssage => {
    updateDiscussionEntry({
      variables: {
        discussionEntryId: props.discussionEntry._id,
        message: newMesssage
      }
    })
  }

  const onOpenInSpeedGrader = () => {
    window.location.assign(
      getSpeedGraderUrl(
        ENV.course_id,
        props.discussionTopic.assignment._id,
        props.discussionEntry.author._id
      )
    )
  }

  // Scrolling auto listener to mark messages as read
  useEffect(() => {
    if (
      !ENV.manual_mark_as_read &&
      !props.discussionEntry.read &&
      !props.discussionEntry?.forcedReadState
    ) {
      const observer = new IntersectionObserver(() => props.markAsRead(props.discussionEntry._id), {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })

      if (threadRef.current) observer.observe(threadRef.current)

      return () => {
        if (threadRef.current) observer.unobserve(threadRef.current)
      }
    }
  }, [threadRef, props.discussionEntry.read, props])

  return (
    <>
      <div style={{marginLeft: marginDepth, paddingLeft: '0.75rem'}} ref={threadRef}>
        <Flex>
          <Flex.Item shouldShrink shouldGrow>
            <PostMessageContainer
              discussionEntry={props.discussionEntry}
              threadActions={threadActions}
              isEditing={isEditing}
              onCancel={() => {
                setIsEditing(false)
              }}
              onSave={onUpdate}
            />
          </Flex.Item>
          {!props.discussionEntry.deleted && (
            <Flex.Item align="stretch">
              <ThreadActions
                id={props.discussionEntry.id}
                isUnread={!props.discussionEntry.read}
                onToggleUnread={toggleUnread}
                onDelete={props.discussionEntry.permissions?.delete ? onDelete : null}
                onEdit={
                  props.discussionEntry.permissions?.update
                    ? () => {
                        setIsEditing(true)
                      }
                    : null
                }
                onOpenInSpeedGrader={
                  props.discussionTopic.permissions?.speedGrader ? onOpenInSpeedGrader : null
                }
                goToParent={
                  props.depth === 0
                    ? null
                    : () => {
                        const topOffset = props.parentRef.current.offsetTop
                        window.scrollTo(0, topOffset - 44)
                      }
                }
                goToTopic={() => {
                  setTimeout(() => {
                    window.scrollTo(0, 0)
                  })
                }}
              />
            </Flex.Item>
          )}
        </Flex>
      </div>
      <div style={{marginLeft: replyMarginDepth}}>
        {editorExpanded && (
          <View
            display="block"
            background="primary"
            borderWidth="none none small none"
            padding="none none small none"
            margin="none none x-small none"
          >
            <DiscussionEdit
              onSubmit={text => {
                createDiscussionEntry({
                  variables: {
                    discussionTopicId: ENV.discussion_topic_id,
                    parentEntryId: props.discussionEntry._id,
                    message: text
                  }
                })
                setEditorExpanded(false)
              }}
              onCancel={() => setEditorExpanded(false)}
            />
          </View>
        )}
      </div>
      {(expandReplies || props.depth > 0) && props.discussionEntry.subentriesCount > 0 && (
        <DiscussionSubentries
          discussionTopic={props.discussionTopic}
          discussionEntryId={props.discussionEntry._id}
          depth={props.depth + 1}
          markAsRead={props.markAsRead}
          parentRef={threadRef}
        />
      )}
      {expandReplies && props.depth === 0 && props.discussionEntry.lastReply && (
        <View
          as="div"
          margin="none none none xx-large"
          width="100%"
          key={`discussion-thread-collapse-${props.discussionEntry.id}`}
        >
          <View
            background="primary"
            borderWidth="none none small none"
            padding="none none small none"
            display="block"
            width="100%"
            margin="none none medium none"
          >
            <CollapseReplies onClick={() => setExpandReplies(false)} />
          </View>
        </View>
      )}
      {openIsolatedView && (
        <IsolatedViewContainer
          discussionEntry={props.discussionEntry}
          onClose={() => {
            setOpenIsolatedView(false)
          }}
          onToggleRating={toggleRating}
          onToggleUnread={toggleUnread}
          onDelete={props.discussionEntry.permissions?.delete ? onDelete : null}
          onOpenInSpeedGrader={
            props.discussionTopic.permissions?.speedGrader ? onOpenInSpeedGrader : null
          }
        />
      )}
    </>
  )
}

DiscussionThreadContainer.propTypes = {
  discussionTopic: Discussion.shape,
  discussionEntry: PropTypes.object.isRequired,
  depth: PropTypes.number,
  markAsRead: PropTypes.func,
  parentRef: PropTypes.object
}

DiscussionThreadContainer.defaultProps = {
  depth: 0
}

export default DiscussionThreadContainer

const DiscussionSubentries = props => {
  const {setOnFailure} = useContext(AlertManagerContext)
  const {sort} = useContext(SearchContext)
  const variables = {
    discussionEntryID: props.discussionEntryId,
    perPage: PER_PAGE,
    sort,
    courseID
  }
  const subentries = useQuery(DISCUSSION_SUBENTRIES_QUERY, {
    variables
  })

  if (subentries.error) {
    setOnFailure(I18n.t('There was an unexpected error loading the replies.'))
    return null
  }

  if (subentries.loading) {
    return <LoadingIndicator />
  }

  return subentries.data.legacyNode.discussionSubentriesConnection.nodes.map(entry => (
    <DiscussionThreadContainer
      key={`discussion-thread-${entry.id}`}
      depth={props.depth}
      discussionEntry={entry}
      discussionTopic={props.discussionTopic}
      markAsRead={props.markAsRead}
      parentRef={props.parentRef}
    />
  ))
}

DiscussionSubentries.propTypes = {
  discussionTopic: Discussion.shape,
  discussionEntryId: PropTypes.string,
  depth: PropTypes.number,
  markAsRead: PropTypes.func,
  parentRef: PropTypes.object
}
