/* Gratefully copied from https://github.com/brentvatne/react-native-animated-demo-tinder */
'use strict';

import React, {Component} from 'react';

import {
    StyleSheet,
    Text,
    View,
    Animated,
    PanResponder,
    Image
} from 'react-native';

import clamp from 'clamp';

import Defaults from './Defaults.js';

var SWIPE_THRESHOLD = 120;

class SwipeCards extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pan: new Animated.ValueXY(),
      enter: new Animated.Value(0.5),
      card: this.props.cards[0],
      nextCard: this.props.cards[1]
    }
  }

  _goToNextCard() {
    // set the top card to the one that was underneath
    this.setState({
      card: this.state.nextCard
    });

    if (this.state.nextCard === null) {
      this.props.handleNoMoreCards && this.props.handleNoMoreCards()
      return
    }

    // set the next card
    let currentCardIdx = this.props.cards.indexOf(this.state.card);
    let newIdx = currentCardIdx + 1;

    // Checks to see if last card.
    // If props.loop=true, will start again from the first card.
    let card = newIdx > this.props.cards.length - 1
      ? this.props.loop ? this.props.cards[0] : null
      : this.props.cards[newIdx];

    // hacky way to make sure the top card is rendered before the next card
    // otherwise there's a flash as the cards are replaced
    setTimeout(() => {
      this.state.pan.setValue({x: 0, y: 0})
      this.setState({
        nextCard: card
      });
    }, 10)

  }

  componentDidMount() {
    if (!this.props.cards.length && this.props.handleNoMoreCards) {
      this.props.handleNoMoreCards()
    }

    this._animateEntrance();
  }

  _animateEntrance() {
    Animated.spring(
      this.state.enter,
      { toValue: 1, friction: 8 }
    ).start();
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onMoveShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (e, gestureState) => {
        this.state.pan.setOffset({x: this.state.pan.x._value, y: this.state.pan.y._value});
        this.state.pan.setValue({x: 0, y: 0});
      },

      onPanResponderMove: Animated.event([
        null, {dx: this.state.pan.x, dy: this.state.pan.y},
      ]),

      onPanResponderRelease: (e, {vx, vy}) => {
        this.state.pan.flattenOffset();
        var velocity;

        if (vx >= 0) {
          velocity = clamp(vx, 3, 5);
        } else if (vx < 0) {
          velocity = clamp(vx * -1, 3, 5) * -1;
        }

        if (Math.abs(this.state.pan.x._value) > SWIPE_THRESHOLD) {
          let cb

          if (this.state.pan.x._value > 0) {
            cb = this._resetState
            this.props.handleYup(this.state.card)
          } else {
            cb = this._goToNextCard
            this.props.handleNope(this.state.card)
          }

          this.props.cardRemoved
            ? this.props.cardRemoved(this.props.cards.indexOf(this.state.card))
            : null

          Animated.decay(this.state.pan, {
            velocity: {x: velocity, y: vy},
            deceleration: 0.98
          }).start(cb.bind(this))
        } else {
          Animated.spring(this.state.pan, {
            toValue: {x: 0, y: 0},
            friction: 4
          }).start()
        }
      }
    })
  }

  _resetState() {
    this.state.pan.setValue({x: 0, y: 0})
  }

  triggerNope() {
    this.props.handleNope(this.state.card)

    this.props.cardRemoved
      ? this.props.cardRemoved(this.props.cards.indexOf(this.state.card))
      : null;

    Animated.timing(this.state.pan, {
      toValue: { x: -1000, y: 0 }
    }).start(this._goToNextCard.bind(this))
  }

  triggerYup() {
    this.props.handleYup(this.state.card)

    Animated.timing(this.state.pan, {
      toValue: { x: 1000, y: 0 }
    }).start(this._resetState.bind(this))
  }

  renderNoMoreCards() {
    if (this.props.renderNoMoreCards)
      return this.props.renderNoMoreCards();

    return (
      <Defaults.NoMoreCards />
    )
  }

  renderCard(cardData) {
    return this.props.renderCard(cardData)
  }

  render() {
    let { pan, enter, } = this.state;

    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: ["30deg", "0deg", "-30deg"]});
    let opacity = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5]});
    let scale = enter;

    let animatedCardstyles = {transform: [{translateX}, {translateY}, {rotate}, {scale}]};

    let yupOpacity = pan.x.interpolate({inputRange: [0, 150], outputRange: [0, 1]});
    let animatedYupStyles = {opacity: yupOpacity}

    let nopeOpacity = pan.x.interpolate({inputRange: [-150, 0], outputRange: [1, 0]});
    let animatedNopeStyles = {opacity: nopeOpacity}

    let nextScale = pan.x.interpolate({inputRange: [-1000, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, 1000], outputRange: [1, 1, 0.95, 1, 1]});
    let animatedNextCardStyles = { transform: [{scale: nextScale}] }

    return (
      <View style={styles.container}>
        { this.state.nextCard
            ? (
                <Animated.View style={[ styles.card, styles.nextCard, animatedNextCardStyles]}>
                  { this.renderCard(this.state.nextCard) }
                </Animated.View>
              )
            : null
        }
        { this.state.card
            ? (
            <Animated.View style={[styles.card, animatedCardstyles]} {...this._panResponder.panHandlers}>
              {this.renderCard(this.state.card)}
              { this.props.renderYup
                ? this.props.renderYup(pan)
                : (
                    this.props.showYup
                    ? (
                      <Animated.View style={[styles.yup, animatedYupStyles]}>
                        <Text style={styles.yupText}>Yup!</Text>
                      </Animated.View>
                    )
                    : null
                  )
              }
              { this.props.renderNope
                ? this.props.renderNope(pan)
                : (
                    this.props.showNope
                    ? (
                      <Animated.View style={[styles.nope, animatedNopeStyles]}>
                        <Text style={styles.nopeText}>Nope!</Text>
                      </Animated.View>
                      )
                    : null
                  )
              }
            </Animated.View>
            )
            : this.renderNoMoreCards() }
      </View>
    );
  }
}

SwipeCards.propTypes = {
  cards: React.PropTypes.array,
  renderCards: React.PropTypes.func,
  loop: React.PropTypes.bool,
  renderNoMoreCards: React.PropTypes.func,
  showYup: React.PropTypes.bool,
  showNope: React.PropTypes.bool,
  handleYup: React.PropTypes.func,
  handleNope: React.PropTypes.func,
  handleNoMoreCards: React.PropTypes.func
};

SwipeCards.defaultProps = {
  loop: false,
  showYup: true,
  showNope: true
};


var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextCard: {
    position: 'absolute',
  },
  yup: {
    borderColor: '#68DE9B',
    borderWidth: 3,
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 5,
    transform: [{rotate: "-15deg"}],
  },
  yupText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#68DE9B',
    backgroundColor: 'transparent',
  },
  nope: {
    borderColor: '#FB7259',
    borderWidth: 3,
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 5,
    transform: [{rotate: "15deg"}],
  },
  nopeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FB7259',
    backgroundColor: 'transparent',
  }
});

export default SwipeCards
