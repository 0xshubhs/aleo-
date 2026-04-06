// greeting.aleo - Minimal demo program for Aleo Scaffold
// Deploy and call from the /greeting route

program greeting.aleo {
    @noupgrade
    async constructor() {}

    // Echo a message back (for testing deployment and execution)
    transition greet(message: field) -> (field) {
        return (message);
    }
}
