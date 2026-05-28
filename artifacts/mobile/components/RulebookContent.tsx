import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
  bg: '#0f0f13',
  surface: '#18181f',
  surface2: '#22222c',
  border: 'rgba(255,255,255,0.08)',
  yellow: '#f5e642',
  red: '#ff3d3d',
  blue: '#3d8fff',
  green: '#2affa0',
  purple: '#b44fff',
  orange: '#ff7c3d',
  pink: '#ff3da8',
  white: '#ffffff',
  dim: 'rgba(255,255,255,0.45)',
  mid: 'rgba(255,255,255,0.75)',
  ink: '#10100e',
};

function OrnDivider() {
  return (
    <View style={s.ornRow}>
      <View style={s.ornLine} />
      <Text style={s.ornText}>✦ ✦ ✦</Text>
      <View style={s.ornLine} />
    </View>
  );
}

function SectionCard({
  accentColors,
  eyebrow,
  eyebrowColor,
  title,
  subtitle,
  children,
}: {
  accentColors: [string, string];
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={[s.sectionAccent, { backgroundColor: accentColors[0] }]} />
      <View style={s.sectionHeader}>
        <View style={s.sectionTitleBlock}>
          <Text style={[s.secEyebrow, { color: eyebrowColor }]}>{eyebrow}</Text>
          <Text style={s.secTitle}>{title}</Text>
          <Text style={s.secSub}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Step({
  num,
  numBg,
  numColor,
  title,
  desc,
  illustration,
}: {
  num: string;
  numBg: string;
  numColor: string;
  title: string;
  desc: string;
  illustration?: React.ReactNode;
}) {
  return (
    <View style={s.step}>
      <View style={s.stepRow}>
        <View style={[s.stepNum, { backgroundColor: numBg }]}>
          <Text style={[s.stepNumText, { color: numColor }]}>{num}</Text>
        </View>
        <View style={s.stepBody}>
          <Text style={s.stepTitle}>{title}</Text>
          <Text style={s.stepDesc}>{desc}</Text>
        </View>
      </View>
      {illustration ? <View style={s.stepIllustration}>{illustration}</View> : null}
    </View>
  );
}

function PileIllustration() {
  const cards = [
    { rank: 'K', suit: '♠', rot: -18, x: -22, y: 4, red: false },
    { rank: '7', suit: '♥', rot: -8, x: -10, y: 2, red: true },
    { rank: 'J', suit: '♦', rot: 3, x: 0, y: 0, red: true },
    { rank: '4', suit: '♣', rot: 12, x: 10, y: 3, red: false },
    { rank: 'A', suit: '♠', rot: 22, x: 20, y: 5, red: false },
  ];
  return (
    <View style={s.pileContainer}>
      {cards.map((c, i) => (
        <View
          key={i}
          style={[
            s.pileCard,
            {
              transform: [{ rotate: `${c.rot}deg` }, { translateX: c.x }, { translateY: c.y }],
              zIndex: i,
            },
          ]}
        >
          <Text style={[s.pileRank, c.red ? s.pileRed : s.pileBlack]}>{c.rank}</Text>
          <Text style={[s.pileSuit, c.red ? s.pileRed : s.pileBlack]}>{c.suit}</Text>
        </View>
      ))}
    </View>
  );
}

function FaceUpOverDownIllustration() {
  const faceUpCards = [
    { rank: 'J', suit: '♠', red: false },
    { rank: 'Q', suit: '♥', red: true },
    { rank: 'A', suit: '♦', red: true },
  ];
  return (
    <View style={s.fuodContainer}>
      <View style={s.fuodRow}>
        {faceUpCards.map((c, i) => (
          <View key={i} style={s.fuodFaceUp}>
            <Text style={[s.fuodRank, c.red ? s.fuodRed : s.fuodBlack]}>{c.rank}</Text>
            <Text style={[s.fuodSuit, c.red ? s.fuodRed : s.fuodBlack]}>{c.suit}</Text>
          </View>
        ))}
      </View>
      <View style={[s.fuodRow, s.fuodLower]}>
        {[0, 1, 2].map(i => (
          <View key={i} style={s.fuodFaceDown}>
            <Text style={s.fuodDownMark}>▪</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BlindFlipIllustration() {
  return (
    <View style={s.bfContainer}>
      {[0, 1, 2].map(i => (
        <View key={i} style={s.bfCard}>
          <Text style={s.bfCrown}>♛</Text>
        </View>
      ))}
    </View>
  );
}

function IridescentTwoCard() {
  return (
    <LinearGradient
      colors={['#ff0080', '#ff8c00', '#ffee00', '#00ff88', '#00cfff', '#9b4fff', '#ff0080']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 10, padding: 3, alignSelf: 'center' }}
    >
      <View style={s.iriCard}>
        <Text style={s.iriRank}>2</Text>
        <Text style={s.iriSuit}>★</Text>
      </View>
    </LinearGradient>
  );
}

function FireTenCard() {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={s.fireFlames}>
        <Text style={[s.fireEmoji, { fontSize: 16 }]}>🔥</Text>
        <Text style={[s.fireEmoji, { fontSize: 22 }]}>🔥</Text>
        <Text style={[s.fireEmoji, { fontSize: 16 }]}>🔥</Text>
      </View>
      <View style={s.fireTenFace}>
        <Text style={s.fireTenRank}>10</Text>
        <Text style={s.fireTenSuit}>♠</Text>
      </View>
    </View>
  );
}

function BonusBurnRow() {
  const suits: Array<{ suit: string; red: boolean }> = [
    { suit: '♠', red: false },
    { suit: '♥', red: true },
    { suit: '♦', red: true },
    { suit: '♣', red: false },
  ];
  return (
    <View style={s.bonusBurnRow}>
      {suits.map(({ suit, red }, i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <Text style={s.bonusFlame}>🔥</Text>
          <View style={s.bonusCard}>
            <Text style={s.bonusRank}>K</Text>
            <Text style={[s.bonusSuit, { color: red ? '#cc0000' : '#10100e' }]}>{suit}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function AnimatedCrown() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.96, duration: 1100, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <View style={s.animCrownWrap}>
      <Animated.View style={[s.crownGlowRing, { transform: [{ scale: pulse }] }]} />
      <View style={s.lensFlareWrap} pointerEvents="none">
        <View style={s.lensFlare} />
      </View>
      <Animated.Text style={[s.crownIcon, { transform: [{ scale: pulse }] }]}>♛</Animated.Text>
    </View>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return <View style={s.tip}>{children}</View>;
}

function Badge({ label, variant }: { label: string; variant: 'green' | 'red' | 'yellow' }) {
  const bg =
    variant === 'green'
      ? 'rgba(42,255,160,0.15)'
      : variant === 'red'
        ? 'rgba(255,61,61,0.15)'
        : 'rgba(245,230,66,0.12)';
  const color =
    variant === 'green' ? C.green : variant === 'red' ? C.red : C.yellow;
  const borderColor =
    variant === 'green'
      ? 'rgba(42,255,160,0.3)'
      : variant === 'red'
        ? 'rgba(255,61,61,0.3)'
        : 'rgba(245,230,66,0.3)';
  return (
    <View style={[s.badge, { backgroundColor: bg, borderColor }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function RuleTile({
  badge,
  badgeVariant,
  head,
  body,
}: {
  badge: string;
  badgeVariant: 'green' | 'red' | 'yellow';
  head: string;
  body: string;
}) {
  return (
    <View style={s.ruleTile}>
      <View style={s.ruleHead}>
        <Badge label={badge} variant={badgeVariant} />
        <Text style={s.ruleHeadText}>{head}</Text>
      </View>
      <Text style={s.ruleBody}>{body}</Text>
    </View>
  );
}

function Phase({
  numeral,
  numColor,
  numBg,
  numBorder,
  title,
  desc,
  isLast,
}: {
  numeral: string;
  numColor: string;
  numBg: string;
  numBorder: string;
  title: string;
  desc: string;
  isLast?: boolean;
}) {
  return (
    <View style={[s.phase, isLast ? s.phaseLast : null]}>
      <View style={[s.phaseNum, { backgroundColor: numBg, borderColor: numBorder }]}>
        <Text style={[s.phaseNumText, { color: numColor }]}>{numeral}</Text>
      </View>
      <View style={s.phaseBody}>
        <Text style={s.phaseTitle}>{title}</Text>
        <Text style={s.phaseDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ZoneCol({
  num,
  label,
  desc,
  rule,
  accentColor,
  accentBg,
  borderColor,
  cards,
}: {
  num: string;
  label: string;
  desc: string;
  rule: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  cards: React.ReactNode;
}) {
  return (
    <View style={[s.zoneCol, { borderColor }]}>
      <View style={[s.zoneAccent, { backgroundColor: accentColor }]} />
      <View style={[s.zoneNum, { backgroundColor: accentBg, borderColor }]}>
        <Text style={[s.zoneNumText, { color: accentColor }]}>{num}</Text>
      </View>
      <Text style={[s.zoneLabel, { color: accentColor }]}>{label}</Text>
      <View style={s.zoneCards}>{cards}</View>
      <Text style={s.zoneDesc}>{desc}</Text>
      <View style={[s.zoneRule, { backgroundColor: accentBg, borderColor }]}>
        <Text style={[s.zoneRuleText, { color: accentColor }]}>{rule}</Text>
      </View>
    </View>
  );
}

function MiniCard({
  rank,
  suit,
  style,
  rankColor,
}: {
  rank: string;
  suit?: string;
  style?: object;
  rankColor?: string;
}) {
  return (
    <View style={[s.miniCard, style]}>
      <Text style={[s.miniRank, rankColor ? { color: rankColor } : null]}>{rank}</Text>
      {suit ? <Text style={[s.miniSuit, rankColor ? { color: rankColor } : null]}>{suit}</Text> : null}
    </View>
  );
}

function FaceDownCard() {
  return (
    <View style={[s.miniCard, s.faceDownCard]}>
      <Text style={s.faceDownText}>?</Text>
    </View>
  );
}

export default function RulebookContent({ bottomInset = 0 }: { bottomInset?: number }) {
  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.page, { paddingBottom: 80 + bottomInset }]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={s.hero}>
        <Text style={s.heroEyebrow}>Official Rules & Guide</Text>
        <Text style={s.heroTitle}>♜ Castle</Text>
        <View style={s.heroChips}>
          {['2–4 Players', 'Standard 52-Card Deck', '~20 Minutes'].map((chip) => (
            <View key={chip} style={s.heroChip}>
              <Text style={s.heroChipText}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <OrnDivider />

      {/* SECTION 1 — What is Castle? */}
      <SectionCard
        accentColors={[C.yellow, C.orange]}
        eyebrow="The Game"
        eyebrowColor={C.yellow}
        title="What is Castle?"
        subtitle="A card-shedding game of nerve, strategy, and a little luck"
      >
        <View style={s.steps}>
          <Step num="1" numBg={C.yellow} numColor={C.ink} title="The Objective" desc="Be the first player to rid yourself of every card — your hand first, then your face-up castle cards, then your blind face-down cards." />
          <Step num="2" numBg={C.blue} numColor="#fff" title="The Shared Pile" desc="A central discard pile sits at the table. On your turn, you must play a card equal to or higher in rank than the top card of the pile." />
          <Step num="3" numBg={C.orange} numColor="#fff" title="Cannot Play?" desc="If you hold no valid card to play, you must collect the entire pile into your hand." />
          <Step num="4" numBg={C.red} numColor="#fff" title="The Loser" desc="The last player still holding cards when all others have finished loses the round — and earns the title." />
        </View>
      </SectionCard>

      <OrnDivider />

      {/* SECTION 2 — Setup */}
      <SectionCard
        accentColors={[C.blue, C.purple]}
        eyebrow="Setup"
        eyebrowColor={C.blue}
        title="Your Three Zones"
        subtitle="Every player receives nine cards across three positions"
      >
        {/* Deal notice */}
        <View style={s.dealNotice}>
          <Text style={s.dealIcon}>🃏</Text>
          <View style={s.dealBody}>
            <Text style={s.dealTitle}>You Are Dealt Your Hand</Text>
            <Text style={s.dealDesc}>Each player receives 9 cards — 3 face-down, 3 face-up on top of them, and 3 held privately.</Text>
          </View>
        </View>

        {/* Decision row */}
        <View style={s.decisionRow}>
          <MiniCard rank="A" suit="♦" rankColor="#9a7800" style={s.spCard} />
          <Text style={s.decArrow}>⇄</Text>
          <MiniCard rank="5" suit="♣" rankColor={C.ink} />
          <View style={s.decText}>
            <Text style={s.decTitle}>The Decision Phase</Text>
            <Text style={s.decDesc}>Choose your three Castle cards. Load your best cards face-up before the game begins.</Text>
          </View>
        </View>

        {/* Zone grid */}
        <View style={s.zoneGrid}>
          <ZoneCol
            num="1"
            label="Face-Down"
            desc="3 cards placed face-down. You may not look at these until you play them."
            rule="🚫 Never peek.\nPlayed blind at the end."
            accentColor={C.purple}
            accentBg="rgba(180,79,255,0.15)"
            borderColor="rgba(180,79,255,0.3)"
            cards={<><FaceDownCard /><FaceDownCard /><FaceDownCard /></>}
          />
          <ZoneCol
            num="2"
            label="Face-Up"
            desc="3 cards face-up on top of your face-down row. Visible to all players."
            rule="👀 Visible to all.\nPlayed once hand is empty."
            accentColor={C.green}
            accentBg="rgba(42,255,160,0.15)"
            borderColor="rgba(42,255,160,0.3)"
            cards={<>
              <MiniCard rank="J" suit="♠" rankColor={C.ink} />
              <MiniCard rank="7" suit="♥" rankColor="#cc0000" />
              <MiniCard rank="A" suit="♦" rankColor="#9a7800" style={s.spCard} />
            </>}
          />
          <ZoneCol
            num="3"
            label="Your Hand"
            desc="3 cards held privately. Refill to 3 from the deck each turn."
            rule="🤫 Always private.\nPlay these first every turn."
            accentColor={C.yellow}
            accentBg="rgba(245,230,66,0.15)"
            borderColor="rgba(245,230,66,0.3)"
            cards={<>
              <MiniCard rank="Q" suit="♥" rankColor="#cc0000" />
              <MiniCard rank="4" suit="♣" rankColor={C.ink} />
              <MiniCard rank="10" suit="♦" rankColor="#008845" style={s.gnCard} />
            </>}
          />
        </View>

        <Tip>
          <Text style={s.tipText}>
            <Text style={s.tipBold}>The wise play: </Text>
            Load your face-up row with 2s, 10s, and Aces. You'll see them and control them in the late game when every card is critical.
          </Text>
        </Tip>
      </SectionCard>

      {/* SECTION 3 — Turn Flow */}
      <SectionCard
        accentColors={[C.green, C.blue]}
        eyebrow="Gameplay"
        eyebrowColor={C.green}
        title="How a Turn Works"
        subtitle="Play → draw → pass — repeat until someone wins"
      >
        <View style={s.steps}>
          <Step num="1" numBg={C.yellow} numColor={C.ink} title="Play a Card — or Multiple" desc="Play one or more cards of the same rank from your hand. All must be equal to or higher in rank than the top card of the pile." />
          <Step num="2" numBg={C.blue} numColor="#fff" title="Refill to Three" desc="After playing, draw from the deck until you hold three cards in hand again — as long as the deck has cards remaining." />
          <Step num="3" numBg={C.red} numColor="#fff" title="Cannot Play? Collect the Pile" desc="If no card in your hand is valid to play, collect every card from the pile into your hand." illustration={<PileIllustration />} />
          <Step num="4" numBg={C.green} numColor={C.ink} title="Hand Empty & Deck Gone — Play Face-Ups" desc="Once your hand is empty and the deck is exhausted, begin playing your face-up cards. Same rules apply." illustration={<FaceUpOverDownIllustration />} />
          <Step num="5" numBg={C.purple} numColor="#fff" title="Face-Ups Gone — Flip Blind" desc="Choose any face-down card without looking. Flip it. Plays legally? Go. Doesn't? Collect the pile and that card into your hand — then immediately play a card on top." illustration={<BlindFlipIllustration />} />
        </View>
      </SectionCard>

      <OrnDivider />

      {/* SECTION 4 — Special Cards */}
      <SectionCard
        accentColors={[C.yellow, C.pink]}
        eyebrow="Power Cards"
        eyebrowColor={C.purple}
        title="Special Cards"
        subtitle="Two cards that command their own rules"
      >
        <View style={s.specGrid}>
          {/* 2 — Wild Card */}
          <View style={[s.specTile, s.tGold]}>
            <IridescentTwoCard />
            <View style={s.specBody}>
              <Text style={s.specRank}>2</Text>
              <Text style={[s.specLabel, { color: C.yellow }]}>Wild Card</Text>
              <Text style={s.specDesc}>May be played on anything — any card, any situation. After playing a 2, the same player immediately plays another card on top of it.</Text>
            </View>
          </View>
          {/* 10 — The Burn */}
          <View style={[s.specTile, s.tRed]}>
            <FireTenCard />
            <View style={s.specBody}>
              <Text style={s.specRank}>10</Text>
              <Text style={[s.specLabel, { color: C.red }]}>The Burn</Text>
              <Text style={s.specDesc}>Destroys the entire pile — all cards permanently removed from play. The player who burns takes another turn immediately.</Text>
            </View>
          </View>
        </View>
        <Tip>
          <Text style={s.tipText}>
            <Text style={s.tipBold}>Bonus burn: </Text>
            Playing four cards of the same rank at once also burns the pile — same effect as a 10. You play again immediately.
          </Text>
          <BonusBurnRow />
        </Tip>
      </SectionCard>

      {/* SECTION 5 — Key Rules */}
      <SectionCard
        accentColors={[C.orange, C.red]}
        eyebrow="The House Rules"
        eyebrowColor={C.orange}
        title="Rules That Matter"
        subtitle="Six rulings every player must know"
      >
        <View style={s.rulesGrid}>
          <RuleTile badge="Legal" badgeVariant="green" head="Equal Rank" body="Playing the same rank as the top card is always a valid play. Equal counts." />
          <RuleTile badge="Legal" badgeVariant="green" head="Multi-Play" body="You may play two, three, or four cards of the same rank in a single turn." />
          <RuleTile badge="Illegal" badgeVariant="red" head="Skip Zones" body="You may not play face-ups while hand cards remain. You may not play face-downs while face-ups remain." />
          <RuleTile badge="Trap" badgeVariant="red" head="Blind Flip Fails" body="If your flipped face-down card cannot be played, you collect the pile and that card into your hand." />
          <RuleTile badge="Rule" badgeVariant="yellow" head="Ace is Highest" body="Ace beats everything — except a 2 wild or a 10 burn. Those two cards override the Ace." />
          <RuleTile badge="Rule" badgeVariant="red" head="Drawing from Deck" body="You cannot draw from the deck if you already hold more than 3 cards in your hand." />
        </View>
      </SectionCard>

      {/* SECTION 6 — How to Win */}
      <SectionCard
        accentColors={[C.green, C.yellow]}
        eyebrow="Victory"
        eyebrowColor={C.green}
        title="How to Win"
        subtitle="Three phases stand between you and glory"
      >
        <View style={s.phases}>
          <Phase
            numeral="I"
            numColor={C.yellow}
            numBg="rgba(245,230,66,0.15)"
            numBorder="rgba(245,230,66,0.4)"
            title="Clear Your Hand"
            desc="Play and refill. Survive being forced to collect. Continue until your hand is empty and the deck is fully exhausted."
          />
          <Phase
            numeral="II"
            numColor={C.blue}
            numBg="rgba(61,143,255,0.15)"
            numBorder="rgba(61,143,255,0.4)"
            title="Clear Your Face-Ups"
            desc="Play your three visible castle cards. Equal or higher to play — or collect the pile. No deck left to draw from."
          />
          <Phase
            numeral="III"
            numColor={C.purple}
            numBg="rgba(180,79,255,0.15)"
            numBorder="rgba(180,79,255,0.4)"
            title="Survive the Blind Flip"
            desc="Three hidden cards between you and freedom. Choose one at a time and flip it blind. Fortune favours the bold."
            isLast
          />
        </View>

        {/* Win Banner */}
        <View style={s.winBanner}>
          <AnimatedCrown />
          <Text style={s.winTitle}>First to clear all three zones wins</Text>
          <Text style={s.winDesc}>
            Play your final face-down card successfully and you are out.{'\n'}Take your bow. Shuffle the deck. Go again.
          </Text>
          <View style={s.loseNote}>
            <Text style={s.loseNoteText}>Last Player Holding Cards Is Defeated And Will Have Their Crown Stripped.</Text>
          </View>
        </View>
      </SectionCard>

      <OrnDivider />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  page: { paddingHorizontal: 16, paddingTop: 44 },

  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#120a20',
    borderWidth: 1,
    borderColor: 'rgba(245,230,66,0.15)',
    marginBottom: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.green,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 72,
    fontWeight: '900',
    color: C.yellow,
    marginBottom: 20,
    letterSpacing: 1,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  heroChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroChipText: { color: C.white, fontSize: 12, fontWeight: '700' },

  ornRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 20 },
  ornLine: { flex: 1, height: 1, backgroundColor: C.border },
  ornText: { fontSize: 14, color: 'rgba(255,255,255,0.15)', flexShrink: 0 },

  section: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 22,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  sectionTitleBlock: { flex: 1 },
  secEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  secTitle: { color: C.white, fontSize: 28, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  secSub: { color: C.dim, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  steps: { gap: 10 },
  step: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 14, fontWeight: '900' },
  stepBody: { flex: 1 },
  stepTitle: { color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 4, lineHeight: 20 },
  stepDesc: { color: C.mid, fontSize: 14, fontWeight: '500', lineHeight: 21 },
  stepIllustration: { marginTop: 14 },

  // Pile illustration
  pileContainer: { height: 80, alignItems: 'center', justifyContent: 'center' },
  pileCard: {
    position: 'absolute',
    width: 44,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#faf8f2',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
    gap: 2,
  },
  pileRank: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  pileSuit: { fontSize: 14, lineHeight: 15 },
  pileRed: { color: '#cc0000' },
  pileBlack: { color: '#10100e' },

  // Face-up over face-down illustration
  fuodContainer: { alignItems: 'center' },
  fuodRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  fuodLower: { marginTop: -16 },
  fuodFaceUp: {
    width: 52,
    height: 70,
    borderRadius: 7,
    backgroundColor: '#faf8f2',
    borderWidth: 2,
    borderColor: 'rgba(200,210,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c0d0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
    gap: 3,
  },
  fuodRank: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  fuodSuit: { fontSize: 16, lineHeight: 17 },
  fuodRed: { color: '#cc0000' },
  fuodBlack: { color: '#10100e' },
  fuodFaceDown: {
    width: 52,
    height: 70,
    borderRadius: 7,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(150,150,180,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  fuodDownMark: { fontSize: 20, color: 'rgba(180,79,255,0.4)' },

  // Blind flip illustration
  bfContainer: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  bfCard: {
    width: 56,
    height: 78,
    borderRadius: 9,
    backgroundColor: '#12101e',
    borderWidth: 2,
    borderColor: 'rgba(245,230,66,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f5e642',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 8,
  },
  bfCrown: { fontSize: 28, color: '#f5e642' },

  tip: {
    borderRadius: 10,
    padding: 14,
    backgroundColor: 'rgba(245,230,66,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: C.yellow,
    marginTop: 14,
  },
  tipText: { color: C.dim, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  tipBold: { color: C.yellow, fontWeight: '800' },

  dealNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginBottom: 10,
  },
  dealIcon: { fontSize: 26, flexShrink: 0 },
  dealBody: { flex: 1 },
  dealTitle: { color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  dealDesc: { color: C.dim, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(245,230,66,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(245,230,66,0.35)',
    borderStyle: 'dashed',
  },
  decArrow: { fontSize: 22, color: C.yellow, flexShrink: 0 },
  decText: { flex: 1 },
  decTitle: { color: C.yellow, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  decDesc: { color: 'rgba(255,245,180,0.65)', fontSize: 13, fontWeight: '500', lineHeight: 19 },

  zoneGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  zoneCol: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.surface2,
    borderWidth: 2,
    overflow: 'hidden',
  },
  zoneAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  zoneNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  zoneNumText: { fontSize: 11, fontWeight: '800' },
  zoneLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  zoneCards: { flexDirection: 'row', justifyContent: 'center', gap: 3 },
  zoneDesc: { color: C.dim, fontSize: 10, lineHeight: 14, textAlign: 'center', fontWeight: '500' },
  zoneRule: {
    width: '100%',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  zoneRuleText: { fontSize: 9, fontWeight: '700', lineHeight: 13, textAlign: 'center' },

  miniCard: {
    width: 26,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#faf8f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 2,
  },
  miniRank: { fontSize: 10, fontWeight: '900', color: '#10100e', lineHeight: 12 },
  miniSuit: { fontSize: 9, color: '#10100e', lineHeight: 10 },
  faceDownCard: {
    backgroundColor: '#1a1a2e',
    borderColor: 'rgba(180,79,255,0.5)',
    borderWidth: 2,
  },
  faceDownText: { fontSize: 12, color: C.purple, fontWeight: '900' },
  spCard: { backgroundColor: '#fffce0', borderColor: C.yellow, borderWidth: 2 },
  gnCard: { backgroundColor: '#edfff8', borderColor: C.green, borderWidth: 2 },
  bnCard: { borderColor: C.red, borderWidth: 2 },

  specGrid: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  specTile: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    backgroundColor: C.surface2,
    borderWidth: 2,
    borderColor: C.border,
  },
  tGold: { borderColor: 'rgba(245,230,66,0.3)', backgroundColor: 'rgba(245,230,66,0.05)' },
  tRed: { borderColor: 'rgba(255,61,61,0.3)', backgroundColor: 'rgba(255,61,61,0.05)' },
  specBody: { gap: 4 },
  specRank: { color: C.white, fontSize: 36, fontWeight: '900', lineHeight: 38 },
  specLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  specDesc: { color: C.mid, fontSize: 13, fontWeight: '500', lineHeight: 19 },

  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ruleTile: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  ruleHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 },
  ruleHeadText: { color: C.white, fontSize: 13, fontWeight: '800' },
  ruleBody: { color: C.dim, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },

  phases: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface2,
  },
  phaseLast: { borderBottomWidth: 0 },
  phaseNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
  },
  phaseNumText: { fontSize: 16, fontWeight: '900' },
  phaseBody: { flex: 1 },
  phaseTitle: { color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  phaseDesc: { color: C.dim, fontSize: 13, fontWeight: '500', lineHeight: 19 },

  winBanner: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#12100a',
    borderWidth: 2,
    borderColor: 'rgba(245,230,66,0.3)',
  },
  crownIcon: { fontSize: 72, color: C.yellow, marginBottom: 4 },
  animCrownWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 6, height: 100 },
  crownGlowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(245,230,66,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(245,230,66,0.35)',
  },
  lensFlareWrap: { position: 'absolute', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  lensFlare: {
    width: 130,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    transform: [{ rotate: '-35deg' }],
  },

  // Iridescent 2-card
  iriCard: {
    width: 62,
    height: 86,
    borderRadius: 8,
    backgroundColor: '#fefefe',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iriRank: { fontSize: 26, fontWeight: '900', color: '#7000cc' },
  iriSuit: { fontSize: 16, color: '#9b4fff' },

  // Fire 10-card
  fireFlames: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: -4 },
  fireEmoji: { fontSize: 18 },
  fireTenFace: {
    width: 62,
    height: 86,
    borderRadius: 8,
    backgroundColor: '#fff8f0',
    borderWidth: 3,
    borderColor: '#ff5500',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#ff4500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  fireTenRank: { fontSize: 24, fontWeight: '900', color: '#cc2200' },
  fireTenSuit: { fontSize: 14, color: '#ff5500' },

  // Bonus burn row
  bonusBurnRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 12 },
  bonusFlame: { fontSize: 18, textAlign: 'center', marginBottom: -4 },
  bonusCard: {
    width: 48,
    height: 66,
    borderRadius: 7,
    backgroundColor: '#fff8f0',
    borderWidth: 2,
    borderColor: '#ff5500',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#ff4500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
  bonusRank: { fontSize: 18, fontWeight: '900', color: '#cc2200' },
  bonusSuit: { fontSize: 13, fontWeight: '700' },
  winTitle: {
    color: C.yellow,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  winDesc: { color: C.mid, fontSize: 15, fontWeight: '500', lineHeight: 23, textAlign: 'center' },
  loseNote: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,61,61,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,61,61,0.3)',
  },
  loseNoteText: {
    color: C.red,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
